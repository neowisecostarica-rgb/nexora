/**
 * Selector multiempresa: nunca concede permisos locales ni cae a CRUD directo.
 * La distinción entre error de sesión, permisos y backend es solo diagnóstica.
 */
import React from 'react';
import {useQuery} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';

export function organizationContextMessage(error) {
 const status=Number(error?.response?.status || error?.status || 0);
 const raw=String(error?.response?.data?.error || error?.code || error?.message || '');
 if(status===401 || raw.includes('UNAUTHORIZED')) return 'La sesión no está autorizada. Iniciá sesión nuevamente.';
 if(status===403 || raw.includes('OWNER_ACCESS_REQUIRED') || raw.includes('NO_ORGANIZATION_ACCESS')) return 'La cuenta no tiene acceso a una empresa autorizada.';
 if(status===404 || raw.includes('404')) return 'No se encontró el servicio de empresas en esta versión.';
 return 'No fue posible cargar las empresas. Revisá la conexión o el servicio.';
}

export default function OrganizationSwitcher(){
 const {user}=useAuth();
 const q=useQuery({
  queryKey:['authorized-organizations',user?.id],
  queryFn:async()=>{
   const r=await base44.functions.invoke('tenantData',{method:'context'});
   if(r.data?.error)throw Object.assign(new Error(r.data.error),{code:r.data.error});
   if(!r.data?.result || !Array.isArray(r.data.result.organizations))throw new Error('INVALID_ORGANIZATION_CONTEXT');
   return r.data.result;
  },
  enabled:!!user?.id,staleTime:0,retry:false
 });
 if(!user?.id)return <p role="status" className="text-xs px-2">Iniciá sesión para elegir empresa.</p>;
 if(q.isPending)return <p role="status" className="text-xs px-2">Cargando empresas…</p>;
 if(q.isError)return <div role="alert" className="grid gap-2 px-2 py-3 text-xs">
  <span>{organizationContextMessage(q.error)}</span>
  <button type="button" className="underline text-left" onClick={()=>q.refetch()}>Reintentar empresas</button>
 </div>;
 const organizations=q.data.organizations;
 const current=sessionStorage.getItem('nexora.organization')||'';
 return <label className="grid gap-1 text-xs px-2 py-3"><span>Empresa de trabajo</span>
  <select aria-label="Empresa de trabajo" className="bg-background text-foreground border rounded p-2 w-full" value={current} onChange={e=>{
   if(window.confirm('¿Cambiar empresa? Se cerrarán los formularios sin guardar.')){
    if(e.target.value)sessionStorage.setItem('nexora.organization',e.target.value);else sessionStorage.removeItem('nexora.organization');
    window.location.assign('/');
   }
  }}>
   <option value="">{q.data.is_super_admin?'Revisión global · Super Admin':'Seleccionar empresa'}</option>
   {current&&!organizations.some(x=>x.id===current)&&<option value={current} disabled>Acceso no disponible</option>}
   {organizations.map(x=><option key={x.id} value={x.id}>{x.commercial_name}</option>)}
  </select>
  {!organizations.length&&!q.data.is_super_admin&&<span>Sin empresa operativa autorizada.</span>}
 </label>;
}
