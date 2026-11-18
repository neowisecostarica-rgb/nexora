/**
 * Propósito: panel Super Admin para empresas, usuarios registrados y permisos de aliados.
 * Lee/escribe únicamente platformAdmin; no realiza CRUD directo de entidades.
 * El servidor decide autoridad. Formularios no asignan propiedad a Gustavo.
 * Legacy se consulta sin migrar. Errores requieren recargar antes de reintentar.
 * Onboarding fase 1: guía no transaccional basada en empresas/membresías verificadas por backend;
 * no envía invitaciones ni certifica entrega/activación sin QA real.
 * Alta asistida: selección y confirmación humana; fail-closed sin is_verified confirmado.
 */
import React,{useState} from 'react';
import {useQuery,useMutation,useQueryClient} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card,CardHeader,CardTitle,CardContent} from '@/components/ui/card';
import PageHeader from '@/components/shared/PageHeader';
const names={owner:'Dueño',staff:'Equipo',buyer:'Cliente importador · consulta'};
const permissions=['operations.read','operations.write','tracking.read','tracking.write','documents.read','documents.write'];
const permissionNames={'operations.read':'Consultar operaciones','operations.write':'Actualizar operaciones','tracking.read':'Consultar seguimiento','tracking.write':'Actualizar seguimiento','documents.read':'Consultar documentos','documents.write':'Actualizar documentos'};
async function invoke(action,values={}){
 const res=await base44.functions.invoke('platformAdmin',{action,...values});
 if(res.data?.error)throw new Error(res.data.message||res.data.error);
 return res.data;
}
function Field({label,children}){return <label className="grid gap-1 text-sm"><span>{label}</span>{children}</label>;}
function Select({children,...props}){return <select className="border rounded-md bg-background p-2 min-h-10 w-full" {...props}>{children}</select>;}
async function overview(){
 const data={organizations:[],users:[],memberships:[],grants:[],operations:[]};
 let skip=0;
 for(let page=0;page<1000;page++){
  const result=await invoke('overview',{skip});
  for(const key of Object.keys(data))data[key].push(...(result[key]||[]));
  if(result.next_skip==null)return data;
  if(result.next_skip<=skip)throw new Error('No se pudo continuar la lista.');
  skip=result.next_skip;
 }
 throw new Error('La lista excede el límite de esta vista.');
}
export default function PlatformAdmin(){
 const {user}=useAuth();const qc=useQueryClient();
 const [tab,setTab]=useState('organizations'),[message,setMessage]=useState('');
 const [onboardingOrganizationId,setOnboardingOrganizationId]=useState('');
 const [onboardingMode,setOnboardingMode]=useState('account_first');
 const [inviteDraft,setInviteDraft]=useState({organization_id:'',email:'',role:'owner'});
 const [org,setOrg]=useState({commercial_name:'',legal_name:'',legal_id:'',email_main:'',organization_type:'importer'});
 const [member,setMember]=useState({organization_id:'',user_id:'',role:'owner',expires_at:''});
 const [grant,setGrant]=useState({partner_organization_id:'',client_organization_id:'',permissions:['operations.read','tracking.read'],operation_ids:[],expires_at:''});
 const [report,setReport]=useState(null);
 const [audit,setAudit]=useState(null);
 const capability=useQuery({queryKey:['platform-capabilities',user?.id],queryFn:()=>invoke('capabilities'),enabled:!!user?.id,staleTime:0});
 const q=useQuery({queryKey:['platform-overview',user?.id],queryFn:overview,enabled:capability.data?.is_super_admin===true});
 const mutation=useMutation({
  mutationFn:({action,values})=>invoke(action,values),
  onSuccess:async(data,variables)=>{
   if(variables.action==='legacy_report')setReport(data.report);
   if(variables.action==='audit_log')setAudit(data);
   setMessage('Acción completada.');await qc.invalidateQueries({queryKey:['platform-overview']});
  },
  onError:()=>setMessage('No se pudo confirmar la acción. Actualizá la vista antes de reintentar.')
 });
 const run=(action,values)=>{setMessage('');mutation.mutate({action,values});};
 if(capability.isLoading)return <p role="status" className="p-6">Comprobando acceso…</p>;
 if(capability.isError)return <div role="alert">No se pudo comprobar el acceso. <Button onClick={()=>capability.refetch()}>Reintentar</Button></div>;
 if(!capability.data?.is_super_admin)return <div role="alert" className="p-6">Este panel requiere acceso de Super Admin.</div>;
 if(q.isLoading)return <p role="status" className="p-6">Cargando plataforma…</p>;
 if(q.isError)return <div role="alert">No se pudo cargar la plataforma. <Button onClick={()=>q.refetch()}>Reintentar</Button></div>;
 const data=q.data||{organizations:[],users:[],memberships:[],grants:[],operations:[]};
 const orgName=id=>data.organizations.find(x=>x.id===id)?.commercial_name||id;
 const userName=id=>data.users.find(x=>x.id===id)?.email||id;
 const activeOrgs=data.organizations.filter(x=>x.active);
 const customers=activeOrgs.filter(x=>x.organization_type==='importer');
 const partners=activeOrgs.filter(x=>x.organization_type==='partner');
 const cargo=data.operations.filter(x=>x.organization_id===grant.client_organization_id);
 const onboardingOrganization=data.organizations.find(x=>x.id===onboardingOrganizationId);
 const onboardingOwners=data.memberships.filter(x=>x.organization_id===onboardingOrganizationId&&x.role==='owner'&&x.status==='active'&&(!x.expires_at||new Date(x.expires_at)>new Date()));
 const onboardingOwnerRegistered=onboardingOwners.some(x=>data.users.some(u=>u.id===x.user_id));
 const selectedMemberUser=data.users.find(x=>x.id===member.user_id);
 const selectedMemberOrg=data.organizations.find(x=>x.id===member.organization_id);
 const assignMembership=()=>{
  // Confirmar datos provenientes del backend antes de una mutación de acceso; nunca inferir ID por correo.
  if(!selectedMemberUser||selectedMemberUser.is_verified!==true||!selectedMemberOrg||!selectedMemberOrg.active)return;
  const detail=`Empresa: ${selectedMemberOrg.commercial_name}\nCuenta registrada: ${selectedMemberUser.email}\nRol: ${names[member.role]||member.role}`;
  if(!window.confirm(`¿Confirmás la asignación de acceso?\n\n${detail}\n\nEsto cambia permisos reales, no envía invitaciones.`))return;
  run('set_membership',{...member,expires_at:member.expires_at?new Date(member.expires_at).toISOString():null});
 };
 return <div className="space-y-5">
  <PageHeader title="Administración de plataforma" subtitle="Super Admin · empresas, usuarios y aliados"/>
  <Card><CardHeader><CardTitle>Entrega guiada de un cliente</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
   <p className="text-muted-foreground">Podés iniciar con una cuenta ya registrada o recibir primero el correo del cliente. Preparar una invitación en pantalla no crea un registro pendiente ni envía un correo.</p>
   <div className="flex flex-wrap gap-2" role="group" aria-label="Origen del onboarding"><Button type="button" variant={onboardingMode==='account_first'?'default':'outline'} onClick={()=>setOnboardingMode('account_first')}>El cliente ya ingresó</Button><Button type="button" variant={onboardingMode==='business_first'?'default':'outline'} onClick={()=>setOnboardingMode('business_first')}>Primero recibimos su correo</Button></div>
   {onboardingMode==='business_first'?<div className="rounded border p-3 space-y-2">
    <p className="font-medium">Ruta inversa · alta preparada</p>
    <ol className="list-decimal list-inside space-y-1"><li>Recibir correo y datos legales directamente del cliente.</li><li>Pre-registrar empresa sin asignar propietario; comprobar que la cédula jurídica no esté duplicada.</li><li>Preparar invitación para el correo indicado. <strong>Estado: no enviada; backend bloqueado.</strong></li><li>Cuando el sistema de invitaciones esté certificado, el cliente se registra o ingresa, acepta con su identidad y el servidor asigna el acceso.</li><li>Validar empresa, primer ingreso y configuración antes de activar comercialmente.</li></ol>
    <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={()=>setTab('organizations')}>Pre-registrar empresa</Button><Button size="sm" variant="outline" onClick={()=>{setInviteDraft(d=>({...d,organization_id:onboardingOrganizationId}));setTab('invites');}}>Preparar invitación</Button></div>
   </div>:<div className="rounded border p-3 space-y-2"><p className="font-medium">Ruta directa · cuenta primero</p><ol className="list-decimal list-inside space-y-1"><li>Cliente inicia sesión con su cuenta mediante Base44.</li><li>Super Admin confirma usuario y correo verificado.</li><li>Selecciona empresa, asigna owner mediante backend seguro y confirma acceso.</li><li>Cliente configura su empresa; Nexora verifica el recorrido antes de entregar.</li></ol><Button type="button" size="sm" variant="outline" onClick={()=>setTab('users')}>Revisar alta asistida</Button></div>
   <label className="grid gap-1 max-w-lg"><span>Empresa a preparar</span><Select value={onboardingOrganizationId} onChange={e=>setOnboardingOrganizationId(e.target.value)}><option value="">Seleccionar empresa</option>{data.organizations.map(x=><option key={x.id} value={x.id}>{x.commercial_name}</option>)}</Select></label>
   {onboardingOrganization&&<ol className="grid md:grid-cols-2 gap-2" aria-label="Pasos de activación">
    <li className="rounded border p-3"><strong>1. Empresa</strong><p>{onboardingOrganization.active&&onboardingOrganization.organization_type?'Registrada y activa':'Revisar activación o clasificación'}</p><Button size="sm" variant="outline" onClick={()=>setTab('organizations')}>Revisar empresa</Button></li>
    <li className="rounded border p-3"><strong>2. Propietario</strong><p>{onboardingOwnerRegistered?'Membresía owner activa con usuario registrado':'Falta comprobar usuario registrado y membresía owner activa'}</p><Button size="sm" variant="outline" onClick={()=>{setMember(m=>({...m,organization_id:onboardingOrganizationId,role:'owner'}));setTab('users');}}>Revisar acceso</Button></li>
    <li className="rounded border p-3"><strong>3. Primer ingreso</strong><p>Pendiente de comprobación con sesión real del propietario y selección de empresa.</p></li>
    <li className="rounded border p-3"><strong>4. Configuración y QA</strong><p>Verificar perfil, documentos, permisos y recorrido operativo antes de entregar.</p></li>
   </ol>}
   <p className="text-xs text-muted-foreground">Estado «pendiente» significa tarea pendiente si no existe una invitación confirmada por backend. Empresa activa no implica propietario validado, invitación aceptada ni habilitación comercial.</p>
  </CardContent></Card>
  <div className="flex flex-wrap gap-2" role="group" aria-label="Secciones de administración">
   {[['organizations','Empresas'],['users','Alta asistida y accesos'],['invites','Invitaciones'],['partners','Aliados'],['legacy','Datos por revisar'],['audit','Historial']].map(([key,title])=><Button key={key} variant={tab===key?'default':'outline'} onClick={()=>setTab(key)}>{title}</Button>)}
   <Button variant="outline" disabled={q.isFetching||mutation.isPending} onClick={()=>q.refetch()}>Actualizar</Button>
  </div>
  {message&&<p role="status" className="border rounded p-3">{message}</p>}
  {tab==='organizations'&&<>
   <Card><CardHeader><CardTitle>Crear empresa</CardTitle></CardHeader><CardContent>
    <form className="grid sm:grid-cols-2 gap-3" onSubmit={e=>{e.preventDefault();run('create_organization',org);}}>
     <Field label="Nombre comercial"><Input required value={org.commercial_name} onChange={e=>setOrg({...org,commercial_name:e.target.value})}/></Field>
     <Field label="Razón social (admite números)"><Input required value={org.legal_name} onChange={e=>setOrg({...org,legal_name:e.target.value})}/></Field>
     <Field label="Cédula jurídica"><Input value={org.legal_id} onChange={e=>setOrg({...org,legal_id:e.target.value})} placeholder="3-101-903239"/></Field>
     <Field label="Correo de la empresa"><Input required type="email" value={org.email_main} onChange={e=>setOrg({...org,email_main:e.target.value})}/></Field>
     <Field label="Tipo"><Select value={org.organization_type} onChange={e=>setOrg({...org,organization_type:e.target.value})}><option value="importer">Importador</option><option value="partner">Aliado · Consulting</option></Select></Field>
     <Button disabled={mutation.isPending} type="submit">Crear empresa</Button>
    </form>
   </CardContent></Card>
   <div className="grid md:grid-cols-2 gap-3">{data.organizations.map(x=><Card key={x.id}><CardContent className="p-4 space-y-2"><h2 className="font-semibold">{x.commercial_name}</h2><p>{x.organization_type==='partner'?'Aliado':x.organization_type==='importer'?'Importador':x.organization_type==='platform'?'Plataforma':'Tipo pendiente de clasificar'} · {x.active?'Activa':'Suspendida'}</p><p className="text-sm">{x.email_main}</p><p className="text-xs text-muted-foreground">Razón social: {x.legal_name || '—'} · Cédula: {x.legal_id || 'No registrada'}</p><Field label="Clasificación"><Select disabled={mutation.isPending} value={x.organization_type||''} onChange={e=>{if(window.confirm('¿Cambiar la clasificación de esta empresa?'))run('classify_organization',{organization_id:x.id,organization_type:e.target.value});}}><option value="" disabled>Pendiente</option><option value="importer">Importador</option><option value="partner">Aliado</option><option value="platform">Plataforma</option></Select></Field><Button variant="outline" disabled={mutation.isPending} onClick={()=>{if(window.confirm((x.active?'Suspender':'Activar')+' '+x.commercial_name+'?'))run('set_organization_status',{organization_id:x.id,active:!x.active});}}>{x.active?'Suspender':'Activar'}</Button></CardContent></Card>)}</div>
   {!data.organizations.length&&<p>No hay empresas registradas.</p>}
  </>}
  {tab==='users'&&<>
   <Card><CardHeader><CardTitle>Alta asistida de un propietario</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
    <ol className="list-decimal list-inside space-y-2">
     <li>El cliente abre Nexora e ingresa o registra su cuenta mediante el acceso nativo de Base44. No se envía una invitación desde este panel.</li>
     <li>Actualizá la lista y comprobá que el usuario completó el acceso a la app y que su correo está verificado. Si ese estado no llega del servidor, la asignación sigue bloqueada.</li>
     <li>Seleccioná la empresa correcta y el rol <strong>Dueño</strong>, verificá la confirmación y guardá el acceso.</li>
     <li>Pedile al cliente que vuelva a iniciar sesión, elija su empresa y complete la configuración inicial. Validá el acceso con su sesión antes de entregar.</li>
    </ol>
    <Button variant="outline" type="button" disabled={q.isFetching||mutation.isPending} onClick={()=>q.refetch()}>Actualizar usuarios registrados</Button>
    <p className="text-xs text-muted-foreground">No se crea automáticamente una cuenta ni se prueba la titularidad del correo desde este panel. La verificación de identidad sigue siendo una condición operativa.</p>
   </CardContent></Card>
   <Card><CardContent className="p-4"><form className="grid sm:grid-cols-2 gap-3" onSubmit={e=>{e.preventDefault();assignMembership();}}>
    <Field label="Empresa"><Select required value={member.organization_id} onChange={e=>setMember({...member,organization_id:e.target.value})}><option value="">Seleccionar</option>{activeOrgs.map(x=><option key={x.id} value={x.id}>{x.commercial_name}</option>)}</Select></Field>
    <Field label="Usuario registrado"><Select required value={member.user_id} onChange={e=>setMember({...member,user_id:e.target.value})}><option value="">Seleccionar</option>{data.users.filter(x=>x.id!==user.id).map(x=><option key={x.id} value={x.id}>{x.email}</option>)}</Select></Field>
    <Field label="Acceso"><Select value={member.role} onChange={e=>setMember({...member,role:e.target.value})}>{Object.entries(names).map(([key,title])=><option key={key} value={key}>{title}</option>)}</Select></Field>
    <Field label="Vencimiento opcional"><Input type="datetime-local" value={member.expires_at} onChange={e=>setMember({...member,expires_at:e.target.value})}/></Field>
    <div className="space-y-2"><Button type="submit" disabled={mutation.isPending||!selectedMemberUser||selectedMemberUser.is_verified!==true||!selectedMemberOrg||!selectedMemberOrg.active}>{member.role==='owner'?'Asignar propietario':'Guardar acceso'}</Button><p className="text-xs text-muted-foreground">{selectedMemberUser&&selectedMemberOrg?`${selectedMemberUser.email} → ${selectedMemberOrg.commercial_name} (${names[member.role]})`:'Elegí empresa y usuario registrado para continuar.'}</p>{selectedMemberUser&&selectedMemberUser.is_verified!==true&&<p role="status" className="text-amber-700 text-xs">La verificación de correo no está confirmada por el servidor. Acceso bloqueado.</p>}</div>
   </form></CardContent></Card>
   <ul className="space-y-2">{data.memberships.map(x=><li key={x.id} className="border rounded p-3 flex flex-wrap items-center justify-between gap-2"><span>{userName(x.user_id)} · {orgName(x.organization_id)} · {names[x.role]} · {x.status}</span>{x.status==='active'&&<Button variant="outline" disabled={mutation.isPending} onClick={()=>{if(window.confirm('¿Revocar este acceso?'))run('revoke_membership',{record_id:x.id});}}>Revocar</Button>}</li>)}</ul>
   {data.users.filter(x=>x.id!==user.id).length===0&&<p role="status">No hay otros usuarios registrados todavía. Pedile al cliente que acceda primero mediante el inicio de sesión nativo y luego actualizá la lista. No se enviaron invitaciones.</p>}
  </>}
  {tab==='invites'&&<Card><CardHeader><CardTitle>Invitar a un propietario</CardTitle></CardHeader><CardContent className="space-y-4 text-sm">
   <p>Ruta inversa: primero se registra empresa y correo del cliente; después se prepara una invitación para que se registre o ingrese y acepte. Se requiere token de un solo uso, vencimiento, revocación y aceptación autenticada.</p>
   <p className="rounded border p-3 text-amber-800" role="status">Estado actual: preparación local, sin invitación persistida ni enviada. No se asignó propietario. Pendiente de seguridad y autorización.</p>
   <form className="grid sm:grid-cols-2 gap-3" onSubmit={e=>e.preventDefault()}>
    <Field label="Empresa"><Select value={inviteDraft.organization_id} onChange={e=>setInviteDraft({...inviteDraft,organization_id:e.target.value})}><option value="">Seleccionar empresa</option>{activeOrgs.filter(x=>x.organization_type==='importer'||x.organization_type==='partner').map(x=><option key={x.id} value={x.id}>{x.commercial_name}</option>)}</Select></Field>
    <Field label="Correo del propietario"><Input type="email" autoComplete="off" value={inviteDraft.email} onChange={e=>setInviteDraft({...inviteDraft,email:e.target.value})} placeholder="propietario@empresa.com"/></Field>
    <Field label="Rol"><Select value={inviteDraft.role} disabled><option value="owner">Propietario</option></Select></Field>
    <div className="flex items-end"><Button disabled type="button">Crear invitación</Button></div>
   </form>
   <p role="status" className="rounded border border-amber-300 bg-amber-50 text-amber-950 p-3">{capability.data?.invitation_ready===true?'El flujo requiere validación operativa antes de enviar invitaciones reales.':'Invitaciones todavía bloqueadas por seguridad: no se creó ni envió ninguna invitación. La activación depende de pruebas backend de identidad, expiración, revocación y concurrencia.'}</p>
   <p>Para aceptar una futura invitación, el usuario tendrá que iniciar sesión con el correo invitado y confirmar desde el flujo seguro de aceptación. No se puede activar una empresa desde esta pantalla.</p>
  </CardContent></Card>}
  {tab==='partners'&&<>
   <p>Consulting recibe permisos por empresa y carga. No se otorga acceso financiero mediante estas autorizaciones. Para visualizar la beta en /consulting, se requiere <strong>Consultar operaciones</strong> y, para ver guías, <strong>Consultar seguimiento</strong>. Invitá al usuario como propietario de la organización aliada correspondiente, nunca como Super Admin.</p>
   <Card><CardContent className="p-4"><form className="grid sm:grid-cols-2 gap-3" onSubmit={e=>{e.preventDefault();run('set_grant',grant);}}>
    <Field label="Aliado"><Select required value={grant.partner_organization_id} onChange={e=>setGrant({...grant,partner_organization_id:e.target.value})}><option value="">Seleccionar</option>{partners.map(x=><option key={x.id} value={x.id}>{x.commercial_name}</option>)}</Select></Field>
    <Field label="Cliente importador"><Select required value={grant.client_organization_id} onChange={e=>setGrant({...grant,client_organization_id:e.target.value,operation_ids:[]})}><option value="">Seleccionar</option>{customers.map(x=><option key={x.id} value={x.id}>{x.commercial_name}</option>)}</Select></Field>
    <fieldset className="space-y-2"><legend>Permisos</legend>{permissions.map(p=><label key={p} className="flex gap-2"><input type="checkbox" checked={grant.permissions.includes(p)} onChange={e=>setGrant({...grant,permissions:e.target.checked?[...grant.permissions,p]:grant.permissions.filter(x=>x!==p)})}/>{permissionNames[p]}</label>)}</fieldset>
    <fieldset className="space-y-2"><legend>Cargas autorizadas</legend>{cargo.map(x=><label key={x.id} className="flex gap-2"><input type="checkbox" checked={grant.operation_ids.includes(x.id)} onChange={e=>setGrant({...grant,operation_ids:e.target.checked?[...grant.operation_ids,x.id]:grant.operation_ids.filter(v=>v!==x.id)})}/>{x.batch_code||x.id}</label>)}{!cargo.length&&<p>No hay cargas con empresa verificada para este cliente.</p>}</fieldset>
    <Button type="submit" disabled={mutation.isPending||!grant.operation_ids.length||!grant.permissions.length}>Guardar autorización</Button>
   </form></CardContent></Card>
   <ul className="space-y-2">{data.grants.map(x=><li key={x.id} className="border rounded p-3 flex flex-wrap justify-between gap-2"><span>{orgName(x.partner_organization_id)} → {orgName(x.client_organization_id)} · {x.status}</span>{x.status==='active'&&<Button variant="outline" disabled={mutation.isPending} onClick={()=>{if(window.confirm('¿Revocar esta autorización?'))run('revoke_grant',{record_id:x.id});}}>Revocar</Button>}</li>)}</ul>
  </>}
  {tab==='audit'&&<Card><CardHeader><CardTitle>Historial administrativo</CardTitle></CardHeader><CardContent className="space-y-3"><Button disabled={mutation.isPending} onClick={()=>run('audit_log',{skip:0})}>Consultar historial</Button>{audit&&<><ul className="space-y-2">{audit.events.map(x=><li key={x.id} className="border rounded p-2"><time>{new Date(x.occurred_at).toLocaleString()}</time> · {x.action} · {x.target_id||'Plataforma'}</li>)}</ul>{audit.next_skip!=null&&<Button disabled={mutation.isPending} onClick={()=>run('audit_log',{skip:audit.next_skip})}>Ver siguientes</Button>}</>}</CardContent></Card>}
  {tab==='legacy'&&<Card><CardHeader><CardTitle>Datos por revisar</CardTitle></CardHeader><CardContent className="space-y-3">
   <p>Este informe identifica registros sin empresa o con una referencia desconocida. No asigna ni modifica datos.</p>
   <Button disabled={mutation.isPending} onClick={()=>run('legacy_report',{})}>Consultar informe</Button>
   {report&&<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="text-left p-2">Área</th><th>Total</th><th>Sin empresa</th><th>Empresa desconocida</th></tr></thead><tbody>{report.map(x=><tr key={x.entity}><td className="p-2">{x.entity}</td><td className="text-center">{x.total}</td><td className="text-center">{x.unassigned}</td><td className="text-center">{x.unknown_organization}</td></tr>)}</tbody></table></div>}
  </CardContent></Card>}
 </div>;
}
