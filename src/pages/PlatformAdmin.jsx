/**
 * Propósito: panel Super Admin para empresas, usuarios registrados y permisos de aliados.
 * Lee/escribe únicamente platformAdmin; no realiza CRUD directo de entidades.
 * El servidor decide autoridad. Formularios no asignan propiedad a Gustavo.
 * Legacy se consulta sin migrar. Errores requieren recargar antes de reintentar.
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
 const [org,setOrg]=useState({commercial_name:'',legal_name:'',email_main:'',organization_type:'importer'});
 const [member,setMember]=useState({organization_id:'',user_id:'',role:'owner',expires_at:''});
 const [grant,setGrant]=useState({partner_organization_id:'',client_organization_id:'',permissions:['tracking.read','tracking.write'],operation_ids:[],expires_at:''});
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
 return <div className="space-y-5">
  <PageHeader title="Administración de plataforma" subtitle="Super Admin · empresas, usuarios y aliados"/>
  <div className="flex flex-wrap gap-2" role="group" aria-label="Secciones de administración">
   {[['organizations','Empresas'],['users','Usuarios y accesos'],['partners','Aliados'],['legacy','Datos por revisar'],['audit','Historial']].map(([key,title])=><Button key={key} variant={tab===key?'default':'outline'} onClick={()=>setTab(key)}>{title}</Button>)}
   <Button variant="outline" disabled={q.isFetching||mutation.isPending} onClick={()=>q.refetch()}>Actualizar</Button>
  </div>
  {message&&<p role="status" className="border rounded p-3">{message}</p>}
  {tab==='organizations'&&<>
   <Card><CardHeader><CardTitle>Crear empresa</CardTitle></CardHeader><CardContent>
    <form className="grid sm:grid-cols-2 gap-3" onSubmit={e=>{e.preventDefault();run('create_organization',org);}}>
     <Field label="Nombre comercial"><Input required value={org.commercial_name} onChange={e=>setOrg({...org,commercial_name:e.target.value})}/></Field>
     <Field label="Nombre legal"><Input required value={org.legal_name} onChange={e=>setOrg({...org,legal_name:e.target.value})}/></Field>
     <Field label="Correo de la empresa"><Input required type="email" value={org.email_main} onChange={e=>setOrg({...org,email_main:e.target.value})}/></Field>
     <Field label="Tipo"><Select value={org.organization_type} onChange={e=>setOrg({...org,organization_type:e.target.value})}><option value="importer">Importador</option><option value="partner">Aliado · Consulting</option></Select></Field>
     <Button disabled={mutation.isPending} type="submit">Crear empresa</Button>
    </form>
   </CardContent></Card>
   <div className="grid md:grid-cols-2 gap-3">{data.organizations.map(x=><Card key={x.id}><CardContent className="p-4 space-y-2"><h2 className="font-semibold">{x.commercial_name}</h2><p>{x.organization_type==='partner'?'Aliado':x.organization_type==='importer'?'Importador':x.organization_type==='platform'?'Plataforma':'Tipo pendiente de clasificar'} · {x.active?'Activa':'Suspendida'}</p><p className="text-sm">{x.email_main}</p><Field label="Clasificación"><Select disabled={mutation.isPending} value={x.organization_type||''} onChange={e=>{if(window.confirm('¿Cambiar la clasificación de esta empresa?'))run('classify_organization',{organization_id:x.id,organization_type:e.target.value});}}><option value="" disabled>Pendiente</option><option value="importer">Importador</option><option value="partner">Aliado</option><option value="platform">Plataforma</option></Select></Field><Button variant="outline" disabled={mutation.isPending} onClick={()=>{if(window.confirm((x.active?'Suspender':'Activar')+' '+x.commercial_name+'?'))run('set_organization_status',{organization_id:x.id,active:!x.active});}}>{x.active?'Suspender':'Activar'}</Button></CardContent></Card>)}</div>
   {!data.organizations.length&&<p>No hay empresas registradas.</p>}
  </>}
  {tab==='users'&&<>
   <p>Asigná usuarios ya registrados. Tu autoridad de Super Admin se mantiene separada de las membresías de las empresas.</p>
   <Card><CardContent className="p-4"><form className="grid sm:grid-cols-2 gap-3" onSubmit={e=>{e.preventDefault();run('set_membership',{...member,expires_at:member.expires_at?new Date(member.expires_at).toISOString():null});}}>
    <Field label="Empresa"><Select required value={member.organization_id} onChange={e=>setMember({...member,organization_id:e.target.value})}><option value="">Seleccionar</option>{activeOrgs.map(x=><option key={x.id} value={x.id}>{x.commercial_name}</option>)}</Select></Field>
    <Field label="Usuario registrado"><Select required value={member.user_id} onChange={e=>setMember({...member,user_id:e.target.value})}><option value="">Seleccionar</option>{data.users.filter(x=>x.id!==user.id).map(x=><option key={x.id} value={x.id}>{x.email}</option>)}</Select></Field>
    <Field label="Acceso"><Select value={member.role} onChange={e=>setMember({...member,role:e.target.value})}>{Object.entries(names).map(([key,title])=><option key={key} value={key}>{title}</option>)}</Select></Field>
    <Field label="Vencimiento opcional"><Input type="datetime-local" value={member.expires_at} onChange={e=>setMember({...member,expires_at:e.target.value})}/></Field>
    <Button type="submit" disabled={mutation.isPending}>Guardar acceso</Button>
   </form></CardContent></Card>
   <ul className="space-y-2">{data.memberships.map(x=><li key={x.id} className="border rounded p-3 flex flex-wrap items-center justify-between gap-2"><span>{userName(x.user_id)} · {orgName(x.organization_id)} · {names[x.role]} · {x.status}</span>{x.status==='active'&&<Button variant="outline" disabled={mutation.isPending} onClick={()=>{if(window.confirm('¿Revocar este acceso?'))run('revoke_membership',{record_id:x.id});}}>Revocar</Button>}</li>)}</ul>
   {data.users.filter(x=>x.id!==user.id).length===0&&<p>No hay otros usuarios registrados todavía. Este panel no envía invitaciones automáticamente.</p>}
  </>}
  {tab==='partners'&&<>
   <p>Consulting recibe permisos por empresa y carga. No se otorga acceso financiero mediante estas autorizaciones.</p>
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
