/**
 * Propósito: administrar plataforma, empresas, membresías y grants de aliados.
 * Lee: sesión, User, OrganizationProfile, OrganizationMembership, PartnerAccessGrant, ImportBatches.
 * Escribe: perfil, membresías, grants y PlatformAuditEvent; nunca costos/ventas/inventario.
 * Cada acción se autoriza en servidor. Auditoría de intento ANTES de mutación.
 * Límite: auditoría y mutación son escrituras secuenciales, no transacción atómica.
 * Migración: solo reporta ownership legacy; no asigna ni elimina registros.
 */
import {isPlatformSuperAdmin} from './authority.mjs';
const permissions=new Set(['operations.read','operations.write','tracking.read','tracking.write','documents.read','documents.write']);
const roles=new Set(['owner','staff','buyer']);
const fail=(status,error)=>({status,body:{error}});
const ok=body=>({status:200,body});
const id=v=>typeof v==='string' && v.trim().length>0 && v.length<=200;
const clean=(v,max=300)=>typeof v==='string'?v.trim().slice(0,max):'';
const safeUser=u=>({id:u.id,email:u.email,full_name:u.full_name,role:u.role});
const pageSize=100;
export async function handlePlatformAdmin(client,input={},now=Date.now()) {
 const user=await client.auth.me();
 if (!user?.id) return fail(401,'UNAUTHORIZED');
 const superAdmin=isPlatformSuperAdmin(user);
 if (input.action==='capabilities') return ok({is_super_admin:superAdmin});
 if (!superAdmin) return fail(403,'PLATFORM_AUTHORITY_REQUIRED');
 const db=client.asServiceRole.entities;
 const audit=async(action,target,detail={})=>db.PlatformAuditEvent.create({
  actor_user_id:user.id,action,target_id:target||'',occurred_at:new Date(now).toISOString(),detail
 });
 const readOrg=async orgId=>{
  if (!id(orgId)) return null;
  const rows=await db.OrganizationProfile.filter({id:orgId},undefined,2);
  return rows?.length===1 && rows[0].id===orgId?rows[0]:null;
 };
 const expiry=()=>{
  if (input.expires_at==null || input.expires_at==='') return null;
  const ms=Date.parse(input.expires_at);
  return Number.isFinite(ms)&&ms>now?new Date(ms).toISOString():false;
 };
 const listAll=async(entity,query={})=>{
  const all=[];
  for(let skip=0;skip<10000;skip+=pageSize){
   const rows=await entity.filter(query,'id',pageSize,skip);
   all.push(...rows);
   if(rows.length<pageSize)return all;
  }
  throw new Error('REPORT_LIMIT_EXCEEDED');
 };
 if(input.action==='audit_log'){
  const skip=input.skip??0;
  if(!Number.isInteger(skip)||skip<0||skip>100000)return fail(400,'INVALID_PAGE');
  await audit('platform.audit.read','',{skip});
  const rows=await db.PlatformAuditEvent.filter({},'-occurred_at',101,skip);
  return ok({events:rows.slice(0,100),next_skip:rows.length>100?skip+100:null});
 }
 if(input.action==='overview'){
  const skip=input.skip??0;
  if(!Number.isInteger(skip)||skip<0||skip>100000)return fail(400,'INVALID_PAGE');
  await audit('platform.overview.read','',{skip});
  const [organizations,users,memberships,grants,operations]=await Promise.all([
   db.OrganizationProfile.filter({},'id',pageSize+1,skip),
   db.User.filter({},'id',pageSize+1,skip),
   db.OrganizationMembership.filter({},'id',pageSize+1,skip),
   db.PartnerAccessGrant.filter({},'id',pageSize+1,skip),
   db.ImportBatches.filter({},'id',pageSize+1,skip)
  ]);
  return ok({organizations:organizations.slice(0,pageSize),users:users.slice(0,pageSize).map(safeUser),
   memberships:memberships.slice(0,pageSize),grants:grants.slice(0,pageSize),
   operations:operations.slice(0,pageSize).map(x=>({id:x.id,batch_code:x.batch_code,organization_id:x.organization_id})),
   next_skip:[organizations,users,memberships,grants,operations].some(x=>x.length>pageSize)?skip+pageSize:null});
 }
 if(input.action==='create_organization'){
  const commercial_name=clean(input.commercial_name),legal_name=clean(input.legal_name),email_main=clean(input.email_main);
  const organization_type=input.organization_type;
  if(!commercial_name||!legal_name||!/^\S+@\S+\.\S+$/.test(email_main)||!['importer','partner'].includes(organization_type))return fail(400,'INVALID_ORGANIZATION');
  await audit('organization.create.attempt','',{commercial_name,organization_type});
  const org=await db.OrganizationProfile.create({commercial_name,legal_name,email_main,organization_type,active:true,
   document_prefix_quote:'COT',document_prefix_sale:'VTA',quote_validity_days:7});
  await audit('organization.create.completed',org.id);
  return ok({organization:org});
 }
 if(input.action==='classify_organization'){
  if(!['importer','partner','platform'].includes(input.organization_type))return fail(400,'INVALID_ORGANIZATION_TYPE');
  const org=await readOrg(input.organization_id);if(!org)return fail(404,'ORGANIZATION_NOT_FOUND');
  await audit('organization.classify.attempt',org.id,{organization_type:input.organization_type});
  await db.OrganizationProfile.update(org.id,{organization_type:input.organization_type});
  await audit('organization.classify.completed',org.id);
  return ok({success:true});
 }
 if(input.action==='set_organization_status'){
  if(typeof input.active!=='boolean')return fail(400,'INVALID_STATUS');
  const org=await readOrg(input.organization_id);
  if(!org)return fail(404,'ORGANIZATION_NOT_FOUND');
  await audit('organization.status.attempt',org.id,{active:input.active});
  await db.OrganizationProfile.update(org.id,{active:input.active});
  await audit('organization.status.completed',org.id);
  return ok({success:true});
 }
 if(input.action==='set_membership'){
  if(!id(input.user_id)||!roles.has(input.role))return fail(400,'INVALID_MEMBERSHIP');
  // Super Admin authority is separate; do not create an automatic tenant owner.
  if(input.user_id===user.id)return fail(400,'SUPER_ADMIN_IS_NOT_TENANT_MEMBER');
  const org=await readOrg(input.organization_id);
  if(!org?.active)return fail(404,'ACTIVE_ORGANIZATION_REQUIRED');
  const users=await db.User.filter({id:input.user_id},undefined,2);
  if(users?.length!==1||users[0].id!==input.user_id)return fail(404,'USER_NOT_FOUND');
  const expires_at=expiry();if(expires_at===false)return fail(400,'INVALID_EXPIRY');
  const existing=await db.OrganizationMembership.filter({user_id:input.user_id,organization_id:org.id},undefined,2);
  if(existing.length>1)return fail(409,'DUPLICATE_MEMBERSHIP');
  await audit('membership.set.attempt',org.id,{user_id:input.user_id,role:input.role});
  const data={user_id:input.user_id,organization_id:org.id,role:input.role,status:'active',expires_at};
  const membership=existing.length?await db.OrganizationMembership.update(existing[0].id,data):await db.OrganizationMembership.create(data);
  await audit('membership.set.completed',membership.id);
  return ok({membership});
 }
 if(input.action==='revoke_membership'||input.action==='revoke_grant'){
  if(!id(input.record_id))return fail(400,'INVALID_RECORD');
  const entity=input.action==='revoke_membership'?db.OrganizationMembership:db.PartnerAccessGrant;
  const rows=await entity.filter({id:input.record_id},undefined,2);
  if(rows?.length!==1||rows[0].id!==input.record_id)return fail(404,'RECORD_NOT_FOUND');
  await audit(input.action+'.attempt',input.record_id);
  await entity.update(input.record_id,{status:'revoked'});
  await audit(input.action+'.completed',input.record_id);
  return ok({success:true});
 }
 if(input.action==='set_grant'){
  const p=input.permissions,ops=input.operation_ids;
  if(!Array.isArray(p)||!p.length||p.some(x=>!permissions.has(x))||!Array.isArray(ops)||ops.length>200||!ops.length||ops.some(x=>!id(x)))return fail(400,'INVALID_GRANT');
  if(input.partner_organization_id===input.client_organization_id)return fail(400,'SELF_GRANT_FORBIDDEN');
  const [partner,customer]=await Promise.all([readOrg(input.partner_organization_id),readOrg(input.client_organization_id)]);
  if(!partner?.active||partner.organization_type!=='partner'||!customer?.active||customer.organization_type!=='importer')return fail(400,'INVALID_PARTNER_OR_CLIENT');
  const expires_at=expiry();if(expires_at===false)return fail(400,'INVALID_EXPIRY');
  // IDs alone never authorize a cross-company operation. Legacy unowned cargo is denied.
  for(const operationId of new Set(ops)){
   const rows=await db.ImportBatches.filter({id:operationId},undefined,2);
   if(rows?.length!==1||rows[0].organization_id!==customer.id)return fail(403,'OPERATION_NOT_OWNED_BY_CLIENT');
  }
  const filter={partner_organization_id:partner.id,client_organization_id:customer.id};
  const existing=await db.PartnerAccessGrant.filter(filter,undefined,2);
  if(existing.length>1)return fail(409,'DUPLICATE_GRANT');
  await audit('grant.set.attempt',customer.id,{partner_organization_id:partner.id,operation_ids:[...new Set(ops)]});
  const data={...filter,status:'active',permissions:[...new Set(p)],operation_ids:[...new Set(ops)],expires_at};
  const grant=existing.length?await db.PartnerAccessGrant.update(existing[0].id,data):await db.PartnerAccessGrant.create(data);
  await audit('grant.set.completed',grant.id);
  return ok({grant});
 }
 if(input.action==='legacy_report'){
  await audit('legacy.report.read','');
  const names=['PurchaseOrders','PurchaseItems','InventoryUnits','ImportBatches','Expenses','Quotes','QuoteItems','Sales','SaleItems','Payments','Reservations','Customers','Suppliers','PricingProfiles','ProductDefinition','ProductVariant','InventoryUnitCostComponents','RecalculationQueue'];
  const organizations=await listAll(db.OrganizationProfile);
  const valid=new Set(organizations.map(x=>x.id));
  const report=[];
  for(const name of names){
   const records=await listAll(db[name]);
   report.push({entity:name,total:records.length,unassigned:records.filter(x=>!x.organization_id).length,
    unknown_organization:records.filter(x=>x.organization_id&&!valid.has(x.organization_id)).length});
  }
  return ok({report,read_only:true,assignment_required:true});
 }
 return fail(400,'UNKNOWN_ACTION');
}
