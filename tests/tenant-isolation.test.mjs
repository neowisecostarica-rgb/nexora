/**
 * Isolation contracts with two tenants and a fake SDK. Real RLS/API sessions remain mandatory.
 * Covers each CRUD entry, parent links, revocation and consistent function package guards.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createTenantClient,scopedEntities,TENANT_ENTITIES} from '../base44/policies/tenant-access.mjs';
import {handleTenantData} from '../base44/functions/tenantData/handler.mjs';
import {createTenantBridge} from '../src/api/tenantBridge.mjs';
const owner={id:'owner',role:'user',email:'owner@example.com'};
const admin={id:'69d69fc4304f277844249dd7',email:'gustavo.aguilar@gmail.com',role:'admin'};
function matches(row,q){
 return Object.entries(q).every(([key,v])=>{
  if(key==='$and')return v.every(x=>matches(row,x));
  if(key==='$or')return v.some(x=>matches(row,x));
  if(v&&typeof v==='object'){
   if('$in' in v)return v.$in.includes(row[key]);
   if('$ne' in v)return row[key]!==v.$ne;
  }
  return row[key]===v;
 });
}
function fake(user=owner,changes={}){
 const tables={OrganizationProfile:[{id:'a',active:true,commercial_name:'A'},{id:'b',active:true,commercial_name:'B'}],
  OrganizationMembership:[{id:'ma',organization_id:'a',user_id:'owner',role:'owner',status:'active'}],
  PlatformAuditEvent:[],InventoryUnits:[{id:'ia',organization_id:'a',cost_purchase_unit:10},{id:'ib',organization_id:'b',cost_purchase_unit:999}],
  PurchaseOrders:[],SaleItems:[],Sales:[],Payments:[],Reservations:[{id:'ra',organization_id:'a',inventory_unit_id:'ia'},{id:'rb',organization_id:'b',inventory_unit_id:'ib'}],
  ...structuredClone(changes)};
 const writes=[],invocations=[];
 const entities=new Proxy({}, {get:(_,name)=>({
  filter:async(q={},sort,limit=500,skip=0)=>(tables[name]||[]).filter(x=>matches(x,q)).slice(skip,skip+limit).map(x=>({...x})),
  create:async data=>{const row={id:'new-'+name,...data};(tables[name]||=[]).push(row);writes.push({entity:name,data});return row;},
  update:async(id,data)=>{const row=(tables[name]||[]).find(x=>x.id===id);Object.assign(row,data);writes.push({entity:name,data});return {...row};},
  delete:async id=>{tables[name]=(tables[name]||[]).filter(x=>x.id!==id);writes.push({entity:name,delete:id});return {success:true};}
 })});
 return {client:{auth:{me:async()=>user},asServiceRole:{entities},functions:{invoke:async(name,args)=>{invocations.push({name,args});return {data:{success:true}};}}},tables,writes,invocations};
}
test('owner scope cannot widen list via OR filter',async()=>{
 const f=fake(),c=await createTenantClient(f.client,'a');
 const rows=await c.entities.InventoryUnits.filter({$or:[{organization_id:'a'},{organization_id:'b'}]});
 assert.deepEqual(rows.map(x=>x.id),['ia']);
});
test('scope prevents get/update/delete by foreign ID without writes',async()=>{
 for(const method of ['get','update','delete']){
  const f=fake(),c=await createTenantClient(f.client,'a');
  await assert.rejects(c.entities.InventoryUnits[method]('ib',{status:'sold'}),/RECORD_NOT_ACCESSIBLE/);
  assert.equal(f.writes.length,0);assert.equal(f.tables.InventoryUnits[1].cost_purchase_unit,999);
 }
});
test('create injects verified organization and rejects ownership spoof',async()=>{
 const f=fake(),c=await createTenantClient(f.client,'a');
 const r=await c.entities.Sales.create({total:50});assert.equal(r.organization_id,'a');
 await assert.rejects(c.entities.Sales.create({total:50,organization_id:'b'}),/OWNERSHIP_CHANGE_FORBIDDEN/);
});
test('owner can update own record but cannot move ownership',async()=>{
 const f=fake(),c=await createTenantClient(f.client,'a');
 await c.entities.InventoryUnits.update('ia',{location:'A1'});assert.equal(f.tables.InventoryUnits[0].location,'A1');
 await assert.rejects(c.entities.InventoryUnits.update('ia',{organization_id:'b'}),/OWNERSHIP_CHANGE_FORBIDDEN/);
});
test('cross-company unit cannot be linked into a sale item',async()=>{
 const f=fake(),c=await createTenantClient(f.client,'a');
 await assert.rejects(c.entities.SaleItems.create({inventory_unit_id:'ib'}),/RECORD_NOT_ACCESSIBLE/);assert.equal(f.writes.length,0);
});
test('cross-company reservation cannot receive payment',async()=>{
 const f=fake(),c=await createTenantClient(f.client,'a');
 await assert.rejects(c.entities.Payments.create({reservation_id:'rb',amount:1}),/RECORD_NOT_ACCESSIBLE/);assert.equal(f.writes.length,0);
 const r=await c.entities.Payments.create({reservation_id:'ra',amount:1});assert.equal(r.organization_id,'a');
});
test('partial updates validate existing related records too',async()=>{
 const f=fake(owner,{Payments:[{id:'p',organization_id:'a',reservation_id:'rb'}]}),c=await createTenantClient(f.client,'a');
 await assert.rejects(c.entities.Payments.update('p',{amount:2}),/RECORD_NOT_ACCESSIBLE/);
});
test('expense dynamic reference stays in tenant',async()=>{
 const f=fake(),c=await createTenantClient(f.client,'a');
 await assert.rejects(c.entities.Expenses.create({linked_entity_type:'InventoryUnits',linked_entity_id:'ib',amount:1}),/RECORD_NOT_ACCESSIBLE/);
 await assert.rejects(c.entities.Expenses.create({linked_entity_type:'User',linked_entity_id:'ia'}),/INVALID_EXPENSE_LINK/);
});
test('system identity and update operators cannot be injected',async()=>{
 const f=fake(),c=await createTenantClient(f.client,'a');
 for(const data of [{id:'chosen'},{$set:{organization_id:'b'}},{'organization_id.x':'b'},{created_by:'other'}])await assert.rejects(c.entities.Sales.create(data));
 assert.equal(f.writes.length,0);
});
test('revocation and expiry are checked on every new request',async()=>{
 for(const changes of [{status:'revoked'},{expires_at:'1970-01-01T00:00:01Z'},{expires_at:'bad'}]){
  const f=fake(owner,{OrganizationMembership:[{organization_id:'a',user_id:'owner',role:'owner',status:'active',...changes}]});
  await assert.rejects(createTenantClient(f.client,'a'),/NO_ORGANIZATION_ACCESS|OWNER_ACCESS_REQUIRED/);
 }
});
test('staff and viewer are denied financial legacy CRUD until dedicated flows exist',async()=>{
 for(const role of ['staff','buyer']){
  const f=fake(owner,{OrganizationMembership:[{organization_id:'a',user_id:'owner',role,status:'active'}]});
  await assert.rejects(createTenantClient(f.client,'a'),/NO_ORGANIZATION_ACCESS|OWNER_ACCESS_REQUIRED/);
 }
});
test('suspended company is denied even with active membership',async()=>{
 const f=fake(owner,{OrganizationProfile:[{id:'a',active:false}]});await assert.rejects(createTenantClient(f.client,'a'),/ACTIVE_ORGANIZATION_REQUIRED/);
});
test('multiple owner memberships require explicit selection',async()=>{
 const f=fake(owner,{OrganizationMembership:['a','b'].map(organization_id=>({organization_id,user_id:'owner',role:'owner',status:'active'}))});
 await assert.rejects(createTenantClient(f.client),/ORGANIZATION_REQUIRED/);
 assert.equal((await (await createTenantClient(f.client,'b')).entities.InventoryUnits.list())[0].id,'ib');
});
test('another platform admin does not obtain global access',async()=>{
 const f=fake({...admin,id:'other'});await assert.rejects(createTenantClient(f.client),/OWNER_ACCESS_REQUIRED/);
});
test('anonymous or expired session cannot invoke legacy data',async()=>{
 await assert.rejects(createTenantClient(fake(null).client),/UNAUTHORIZED/);
 const f=fake();f.client.auth.me=async()=>{throw new Error('expired');};await assert.rejects(createTenantClient(f.client),/UNAUTHORIZED/);
});
test('Super Admin global review is audited and retains unassigned legacy visibility',async()=>{
 const f=fake(admin,{InventoryUnits:[{id:'old'},{id:'ib',organization_id:'b'}]});
 const c=await createTenantClient(f.client);
 assert.equal((await c.entities.InventoryUnits.list()).length,2);assert.equal(f.tables.PlatformAuditEvent[0].action,'legacy.data.access');
});
test('Super Admin scoped mode cannot accidentally read another tenant',async()=>{
 const f=fake(admin),c=await createTenantClient(f.client,'a');
 assert.deepEqual((await c.entities.InventoryUnits.list()).map(x=>x.id),['ia']);
});
test('global creation requires an active explicit company and preserves reference ownership',async()=>{
 const f=fake(admin),c=await createTenantClient(f.client);
 await assert.rejects(c.entities.Sales.create({total:2}),/ORGANIZATION_REQUIRED_FOR_CREATE/);
 await assert.rejects(c.entities.SaleItems.create({organization_id:'a',inventory_unit_id:'ib'}),/CROSS_COMPANY_REFERENCE/);
 await assert.rejects(c.entities.Sales.create({organization_id:'unknown',total:2}),/ACTIVE_ORGANIZATION_REQUIRED/);
});
test('nested backend invocation preserves user transport and verified company',async()=>{
 const f=fake(),c=await createTenantClient(f.client,'a');
 await c.asServiceRole.functions.invoke('calculateAndCachePricing',{organization_id:'b',inventory_unit_id:'ia'});
 assert.deepEqual(f.invocations[0],{name:'calculateAndCachePricing',args:{organization_id:'a',inventory_unit_id:'ia'}});
 await c.functions.invoke('calculateAndCachePricing',{organization_id:'b',inventory_unit_id:'ia'});
 assert.deepEqual(f.invocations[1],{name:'calculateAndCachePricing',args:{organization_id:'a',inventory_unit_id:'ia'}});
});
test('tenant cannot access privileged entity or create/delete company profile',async()=>{
 const f=fake(),c=await createTenantClient(f.client,'a');
 assert.throws(()=>c.entities.User,/ENTITY_NOT_ALLOWED/);
 assert.throws(()=>c.entities.OrganizationMembership,/ENTITY_NOT_ALLOWED/);
 await assert.rejects(c.entities.OrganizationProfile.create({commercial_name:'fake'}),/USE_PLATFORM_ADMIN/);
 await assert.rejects(c.entities.OrganizationProfile.delete('a'),/USE_PLATFORM_ADMIN/);
 await assert.rejects(c.entities.OrganizationProfile.update('a',{active:false}),/USE_PLATFORM_ADMIN/);
});
test('gateway enforces operation whitelist and sane pagination',async()=>{
 const f=fake();
 await assert.rejects(handleTenantData(f.client,{entity:'User',method:'list',args:[]}),/INVALID_ENTITY_OPERATION/);
 await assert.rejects(handleTenantData(f.client,{entity:'InventoryUnits',method:'filter',args:[{},null,501]}),/INVALID_LIMIT/);
 const result=await handleTenantData(f.client,{entity:'InventoryUnits',method:'get',args:['ia']});assert.equal(result.id,'ia');
});
test('context discovery exposes only company labels, never banking data',async()=>{
 const f=fake(owner,{OrganizationProfile:[{id:'a',active:true,commercial_name:'A',bank_details:'secret'},{id:'b',active:true}]});
 const result=await handleTenantData(f.client,{method:'context'});
 assert.equal(result.organizations.length,1);assert.equal(result.organizations[0].bank_details,undefined);
});
test('browser bridge preserves SDK shapes and never falls back on gateway failure',async()=>{
 let rawRead=false;const calls=[];
 const raw={auth:{me:()=>owner},entities:{InventoryUnits:{list:()=>{rawRead=true;}}},functions:{invoke:async(name,args)=>{calls.push({name,args});return {data:{result:[{id:'ia'}]}};}}};
 const b=createTenantBridge(raw,()=> 'a');
 assert.deepEqual(await b.entities.InventoryUnits.list('-created_date',10),[{id:'ia'}]);
 assert.equal(calls[0].args.organization_id,'a');assert.equal(rawRead,false);assert.equal(b.auth,raw.auth);
 raw.functions.invoke=async()=>{throw new Error('offline');};
 await assert.rejects(b.entities.InventoryUnits.list(),/offline/);assert.equal(rawRead,false);
});
test('20 business entity schemas close raw CRUD for all user roles',()=>{
 for(const name of TENANT_ENTITIES){
  const j=JSON.parse(readFileSync(new URL('../base44/entities/'+name+'.jsonc',import.meta.url)));
  for(const op of ['read','create','update','delete'])assert.equal(j.rls[op].user_condition.role,'__server_only__');
 }
});
test('every legacy backend entry uses identical local scope guard',()=>{
 const root=new URL('../base44/functions/',import.meta.url),canonical=readFileSync(new URL('../base44/policies/tenant-access.mjs',import.meta.url),'utf8');
 for(const name of readdirSync(root)){
  if(['platformAdmin','getActiveOrganizationProfile','tenantData','finalizeSaleWithCostFreeze'].includes(name))continue;
  const entry=new URL(name+'/entry.ts',root);if(!existsSync(entry))continue;
  const code=readFileSync(entry,'utf8');assert.ok(code.includes('await clientForRequest(rawClient, req)'),name);
  assert.equal(readFileSync(new URL(name+'/tenant-access.mjs',root),'utf8'),canonical,name);
 }
 assert.equal(readFileSync(new URL('tenantData/tenant-access.mjs',root),'utf8'),canonical);
});

test('owner cannot orphan a record by clearing company ownership',async()=>{
 const f=fake(),c=await createTenantClient(f.client,'a');
 await assert.rejects(c.entities.InventoryUnits.update('ia',{organization_id:null}),/OWNERSHIP_CHANGE_FORBIDDEN/);
 assert.equal(f.tables.InventoryUnits[0].organization_id,'a');assert.equal(f.writes.length,0);
});
