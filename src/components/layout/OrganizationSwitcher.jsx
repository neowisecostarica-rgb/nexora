/**
 * Propósito: seleccionar contexto de empresa autorizado por el servidor.
 * Cambio: recarga completa para separar cachés y formularios entre empresas.
 * La selección en sessionStorage nunca otorga permiso por sí misma.
 */
import React from 'react';
import {useQuery} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {useAuth} from '@/lib/AuthContext';
export default function OrganizationSwitcher(){
 const {user}=useAuth();
 const q=useQuery({queryKey:['authorized-organizations',user?.id],queryFn:async()=>{
  const r=await base44.functions.invoke('tenantData',{method:'context'});
  if(r.data?.error)throw new Error(r.data.error);return r.data.result;
 },enabled:!!user?.id,staleTime:0});
 if(q.isLoading)return <p role="status" className="text-xs px-2">Cargando empresas…</p>;
 if(q.isError)return <button className="text-xs p-2 underline" onClick={()=>q.refetch()}>Reintentar empresas</button>;
 const organizations=q.data?.organizations||[];
 const current=sessionStorage.getItem('nexora.organization')||'';
 return <label className="grid gap-1 text-xs px-2 py-3"><span>Empresa de trabajo</span>
  <select aria-label="Empresa de trabajo" className="bg-background text-foreground border rounded p-2 w-full" value={current} onChange={e=>{
   if(window.confirm('¿Cambiar empresa? Se cerrarán los formularios sin guardar.')){
    if(e.target.value)sessionStorage.setItem('nexora.organization',e.target.value);else sessionStorage.removeItem('nexora.organization');
    window.location.assign('/');
   }
  }}>
   <option value="">{q.data?.is_super_admin?'Revisión global · Super Admin':'Seleccionar empresa'}</option>
   {current&&!organizations.some(x=>x.id===current)&&<option value={current} disabled>Acceso no disponible</option>}
   {organizations.map(x=><option key={x.id} value={x.id}>{x.commercial_name}</option>)}
  </select>
  {!organizations.length&&!q.data?.is_super_admin&&<span>Sin empresa operativa autorizada.</span>}
 </label>;
}
