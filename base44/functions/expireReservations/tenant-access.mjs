/**
 * Propósito: frontera de datos para módulos heredados; todas las lecturas y escrituras
 * se ligan a una empresa autorizada en servidor. Usar solo con SDK autenticado.
 * Lee membresías/perfiles y valida referencias; inyecta organization_id al crear.
 * Super Admin puede revisar legacy globalmente, con auditoría por petición.
 * No certifica transacciones/cron: jobs sin identidad son rechazados, nunca reactivados.
 * Este archivo se copia en cada paquete Deno; las pruebas exigen igualdad con el canónico.
 */
const SUPER_ID='69d69fc4304f277844249dd7';
export const TENANT_ENTITIES=['Customers','Expenses','ImportBatches','InventoryUnitCostComponents','InventoryUnits','Payments','PricingProfiles','ProductDefinition','ProductVariant','PurchaseItems','PurchaseOrders','QuoteItems','Quotes','RecalculationQueue','Reservations','SaleItems','Sales','Suppliers','CostComponentDefinitions','OrganizationProfile'];
const allowed=new Set(TENANT_ENTITIES);
const references={
 PurchaseOrders:{supplier_id:'Suppliers',import_batch_id:'ImportBatches'},
 PurchaseItems:{purchase_order_id:'PurchaseOrders',product_definition_id:'ProductDefinition',product_variant_id:'ProductVariant'},
 InventoryUnits:{purchase_item_id:'PurchaseItems',import_batch_id:'ImportBatches',assigned_pricing_profile_id:'PricingProfiles',product_definition_id:'ProductDefinition',product_variant_id:'ProductVariant'},
 ProductVariant:{product_definition_id:'ProductDefinition'},
 Quotes:{customer_id:'Customers'},QuoteItems:{quote_id:'Quotes',inventory_unit_id:'InventoryUnits'},
 Reservations:{inventory_unit_id:'InventoryUnits',sale_id:'Sales'},
 Payments:{reservation_id:'Reservations',sale_id:'Sales'},
 SaleItems:{sale_id:'Sales',inventory_unit_id:'InventoryUnits'},
 Sales:{customer_id:'Customers',quote_id:'Quotes'},
 InventoryUnitCostComponents:{inventory_unit_id:'InventoryUnits'},
 RecalculationQueue:{inventory_unit_id:'InventoryUnits'}
};
export class AccessError extends Error{
 constructor(code,status=403){super(code);this.status=status;this.code=code;}
}
const platform=user=>user?.id===SUPER_ID&&user.role==='admin'&&user.email?.trim().toLowerCase()==='gustavo.aguilar@gmail.com';
const validId=v=>typeof v==='string'&&v.trim().length>0&&v.length<=200;
export async function resolveTenantContext(client,requestedId,now=Date.now()){
 let user;try{user=await client.auth.me();}catch{throw new AccessError('UNAUTHORIZED',401);}
 if(!user?.id)throw new AccessError('UNAUTHORIZED',401);
 if(requestedId!=null&&!validId(requestedId))throw new AccessError('INVALID_ORGANIZATION',400);
 const raw=client.asServiceRole.entities;
 if(platform(user)){
  await raw.PlatformAuditEvent.create({actor_user_id:user.id,action:'legacy.data.access',target_id:requestedId||'',occurred_at:new Date(now).toISOString(),detail:{mode:requestedId?'company':'platform'}});
  if(requestedId){
   const orgs=await raw.OrganizationProfile.filter({id:requestedId,active:true},undefined,2);
   if(orgs.length!==1||orgs[0].id!==requestedId)throw new AccessError('ACTIVE_ORGANIZATION_REQUIRED');
  }
  return {user,organizationId:requestedId||null,isSuperAdmin:true};
 }
 const rows=await raw.OrganizationMembership.filter({user_id:user.id,status:'active'},undefined,500);
 const active=rows.filter(m=>m.user_id===user.id&&m.status==='active'&&m.role==='owner'&&
  validId(m.organization_id)&&(m.expires_at==null||(Number.isFinite(Date.parse(m.expires_at))&&Date.parse(m.expires_at)>now)));
 const ids=[...new Set(active.map(x=>x.organization_id))];
 const chosen=requestedId||(ids.length===1?ids[0]:null);
 if(!chosen)throw new AccessError(ids.length>1?'ORGANIZATION_REQUIRED':'OWNER_ACCESS_REQUIRED');
 if(!ids.includes(chosen))throw new AccessError('NO_ORGANIZATION_ACCESS');
 const orgs=await raw.OrganizationProfile.filter({id:chosen,active:true},undefined,2);
 if(orgs.length!==1||orgs[0].id!==chosen||orgs[0].active!==true)throw new AccessError('ACTIVE_ORGANIZATION_REQUIRED');
 return {user,organizationId:chosen,isSuperAdmin:false};
}
export function scopedEntities(raw,context){
 const orgId=context.organizationId;
 const global=context.isSuperAdmin&&!orgId;
 const queryFor=(name,q={})=>{
  if(!q||typeof q!=='object'||Array.isArray(q))throw new AccessError('INVALID_QUERY',400);
  return global?q:{$and:[name==='OrganizationProfile'?{id:orgId}:{organization_id:orgId},q]};
 };
 const exists=async(name,recordId)=>{
  if(!validId(recordId))throw new AccessError('INVALID_RECORD_ID',400);
  const rows=await raw[name].filter(queryFor(name,{id:recordId}),undefined,2);
  if(rows.length!==1||rows[0].id!==recordId)throw new AccessError('RECORD_NOT_ACCESSIBLE',404);
  return rows[0];
 };
 const validate=async(name,data,current={})=>{
  if(!data||typeof data!=='object'||Array.isArray(data))throw new AccessError('INVALID_DATA',400);
  if(!global&&data.organization_id!=null&&data.organization_id!==orgId)throw new AccessError('OWNERSHIP_CHANGE_FORBIDDEN');
  // No API caller may alter immutable record identity/audit provenance through SDK payloads.
  if(Object.keys(data).some(k=>k.startsWith('$')||k.includes('.')))throw new AccessError('INVALID_FIELD',400);
  if(['id','created_by_id','created_by','created_date','updated_date'].some(k=>Object.hasOwn(data,k)))throw new AccessError('SYSTEM_FIELD_FORBIDDEN',400);
  const candidate={...current,...data};
  for(const [field,target] of Object.entries(references[name]||{})){
   if(candidate[field]!=null&&candidate[field]!==''){
    const linked=await exists(target,candidate[field]);
    if(candidate.organization_id&&linked.organization_id!==candidate.organization_id)throw new AccessError('CROSS_COMPANY_REFERENCE');
   }
  }
  if(name==='Expenses'&&candidate.linked_entity_id){
   if(!['InventoryUnits','ImportBatches','PurchaseItems'].includes(candidate.linked_entity_type))throw new AccessError('INVALID_EXPENSE_LINK',400);
   const linked=await exists(candidate.linked_entity_type,candidate.linked_entity_id);
   if(candidate.organization_id&&linked.organization_id!==candidate.organization_id)throw new AccessError('CROSS_COMPANY_REFERENCE');
  }
 };
 return new Proxy({}, {get:(_,name)=>{
  if(!allowed.has(name))throw new AccessError('ENTITY_NOT_ALLOWED');
  return {
   filter:(query={},sort,limit,skip)=>raw[name].filter(queryFor(name,query),sort,limit,skip),
   list:(sort,limit,skip)=>raw[name].filter(queryFor(name,{}),sort,limit,skip),
   get:recordId=>exists(name,recordId),
   create:async data=>{
    if(name==='OrganizationProfile')throw new AccessError('USE_PLATFORM_ADMIN');
    await validate(name,data);
    if(global&&!validId(data.organization_id))throw new AccessError('ORGANIZATION_REQUIRED_FOR_CREATE');
    if(global){
     const orgs=await raw.OrganizationProfile.filter({id:data.organization_id,active:true},undefined,2);
     if(orgs.length!==1||orgs[0].id!==data.organization_id)throw new AccessError('ACTIVE_ORGANIZATION_REQUIRED');
    }
    const payload={...data,organization_id:global?data.organization_id:orgId};
    return raw[name].create(payload);
   },
   update:async(recordId,data)=>{
    const current=await exists(name,recordId);
    if(name==='OrganizationProfile'&&!context.isSuperAdmin&&Object.keys(data).some(k=>['active','organization_type'].includes(k)))throw new AccessError('USE_PLATFORM_ADMIN');
    if(Object.hasOwn(data,'organization_id')&&data.organization_id!==current.organization_id)throw new AccessError('OWNERSHIP_CHANGE_FORBIDDEN');
    await validate(name,data,current);
    return raw[name].update(recordId,data);
   },
   delete:async recordId=>{
    if(name==='OrganizationProfile')throw new AccessError('USE_PLATFORM_ADMIN');
    await exists(name,recordId);return raw[name].delete(recordId);
   }
  };
 }});
}
export async function createTenantClient(client,requestedId,now=Date.now()){
 const context=await resolveTenantContext(client,requestedId,now);
 const entities=scopedEntities(client.asServiceRole.entities,context);
 const functions={invoke:(name,args={})=>client.functions.invoke(name,{...args,...(context.organizationId?{organization_id:context.organizationId}:{})})};
 const service=new Proxy(client.asServiceRole,{get:(target,key)=>key==='entities'?entities:key==='functions'?functions:Reflect.get(target,key)});
 return new Proxy(client,{get:(target,key)=>key==='entities'?entities:key==='asServiceRole'?service:key==='tenantContext'?context:Reflect.get(target,key)});
}
export async function clientForRequest(client,req){
 let input={};
 if(req.method!=='GET'){try{input=await req.clone().json();}catch{ /* original entry validates its request */ }}
 return createTenantClient(client,input?.organization_id);
}
