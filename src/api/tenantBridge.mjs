/**
 * Propósito: adaptar la API de entidades existente al endpoint tenantData sin reescribir pantallas.
 * Efectos: CRUD pasa por servidor; contexto de empresa es solo una selección, no autoridad.
 * SDK auth/integrations se preservan. Nunca existe fallback a CRUD directo si falla el gateway.
 */
export function createTenantBridge(raw,getOrganizationId){
 const invoke=async(name,payload={})=>{
  const organization_id=getOrganizationId();
  return raw.functions.invoke(name,{...payload,...(organization_id?{organization_id}:{})});
 };
 const entities=new Proxy({}, {get:(_,entity)=>new Proxy({}, {get:(_target,method)=>async(...args)=>{
  if(!['list','filter','get','create','update','delete'].includes(method))throw new Error('Operación no disponible.');
  const response=await invoke('tenantData',{entity,method,args});
  if(response.data?.error)throw new Error(response.data.error);
  return response.data?.result;
 }})});
 const functions=new Proxy(raw.functions,{get:(target,key)=>key==='invoke'?invoke:Reflect.get(target,key)});
 return new Proxy(raw,{get:(target,key)=>key==='entities'?entities:key==='functions'?functions:Reflect.get(target,key)});
}
