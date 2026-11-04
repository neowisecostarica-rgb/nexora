/**
 * Propósito: sustituir CRUD directo del navegador por acceso empresarial validado.
 * Datos: entidades operativas mediante tenant-access; no expone User/membresías/grants.
 * Contexto proviene de auth.me y almacenamiento servidor, nunca del rol recibido.
 */
import {createTenantClient,AccessError,TENANT_ENTITIES} from './tenant-access.mjs';
const isPlatform=u=>u?.id==='69d69fc4304f277844249dd7'&&u.role==='admin'&&u.email?.trim().toLowerCase()==='gustavo.aguilar@gmail.com';
export async function handleTenantData(client,input={}){
 if(input.method==='context'){
  const user=await client.auth.me();if(!user?.id)throw new AccessError('UNAUTHORIZED',401);
  const db=client.asServiceRole.entities;
  let organizations=[];
  if(isPlatform(user)){
   await db.PlatformAuditEvent.create({actor_user_id:user.id,action:'platform.context.read',target_id:'',occurred_at:new Date().toISOString(),detail:{}});
   for(let skip=0;skip<10000;skip+=100){
    const rows=await db.OrganizationProfile.filter({active:true},'id',100,skip);
    organizations.push(...rows);if(rows.length<100)break;
    if(skip===9900)throw new AccessError('CONTEXT_LIMIT_EXCEEDED',409);
   }
  }else{
   const rows=await db.OrganizationMembership.filter({user_id:user.id,status:'active'},'id',500);
   if(rows.length===500)throw new AccessError('CONTEXT_LIMIT_EXCEEDED',409);
   const now=Date.now(),ids=[...new Set(rows.filter(m=>m.user_id===user.id&&m.status==='active'&&m.role==='owner'&&(m.expires_at==null||Date.parse(m.expires_at)>now)).map(m=>m.organization_id))];
   for(const id of ids){
    const records=await db.OrganizationProfile.filter({id,active:true},undefined,2);
    if(records.length===1&&records[0].id===id&&records[0].active===true)organizations.push(records[0]);
   }
  }
  return {organizations:organizations.map(x=>({id:x.id,commercial_name:x.commercial_name,organization_type:x.organization_type})),is_super_admin:isPlatform(user)};
 }
 if(!TENANT_ENTITIES.includes(input.entity)||!['filter','list','get','create','update','delete'].includes(input.method))throw new AccessError('INVALID_ENTITY_OPERATION',400);
 const sdk=await createTenantClient(client,input.organization_id);
 const entity=sdk.entities[input.entity];
 const args=input.args;
 if(!Array.isArray(args)||args.length>4)throw new AccessError('INVALID_ARGUMENTS',400);
 if(['list','filter'].includes(input.method)){
  const index=input.method==='filter'?2:1;
  if(args[index]!=null&&(!Number.isInteger(args[index])||args[index]<1||args[index]>500))throw new AccessError('INVALID_LIMIT',400);
  if(args[index+1]!=null&&(!Number.isInteger(args[index+1])||args[index+1]<0))throw new AccessError('INVALID_OFFSET',400);
 }
 return entity[input.method](...args);
}
