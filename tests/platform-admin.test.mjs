/**
 * Contract tests for platform authority and administration with a persistent fake SDK.
 * Validates rejection before mutations; does not certify Base44 RLS or deployment.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handlePlatformAdmin} from '../base44/functions/platformAdmin/handler.mjs';
import {isPlatformSuperAdmin} from '../base44/functions/platformAdmin/authority.mjs';
import {getOrganizationProfile} from '../base44/functions/getActiveOrganizationProfile/handler.mjs';
const admin={id:'69d69fc4304f277844249dd7',email:'gustavo.aguilar@gmail.com',role:'admin'};
const importer={id:'org',commercial_name:'Importadora',legal_name:'Importadora SA',email_main:'client@example.com',active:true,organization_type:'importer'};
const partner={id:'cc',active:true,organization_type:'partner'};
function fake(user=admin,seed={}){
 const tables=structuredClone({User:[admin,{id:'client',email:'client@example.com',role:'user',secret:'hidden'}],OrganizationProfile:[importer,partner],
  OrganizationMembership:[],PartnerAccessGrant:[],ImportBatches:[{id:'cargo',organization_id:'org'}],PlatformAuditEvent:[],...seed});
 const writes=[];const queries=[];const entities=new Proxy({}, {get:(_,name)=>({
  filter:async(q={},sort,limit=500,skip=0)=>{
   queries.push({entity:name,q,limit,skip});
   return (tables[name]||[]).filter(r=>Object.entries(q).every(([k,v])=>r[k]===v)).slice(skip,skip+limit).map(x=>({...x}));
  },
  create:async data=>{
   const item={id:name+'-'+((tables[name]||[]).length+1),...data};
   (tables[name]||=[]).push(item);writes.push({entity:name,type:'create',data:item});return item;
  },
  update:async(id,data)=>{
   const row=(tables[name]||[]).find(x=>x.id===id);if(!row)throw new Error('missing');
   Object.assign(row,data);writes.push({entity:name,type:'update',data});return {...row};
  }
 })});
 return {client:{auth:{me:async()=>user},asServiceRole:{entities}},tables,writes,queries};
}
test('Super Admin needs the pinned ID, email and platform role',()=>{
 assert.equal(isPlatformSuperAdmin(admin),true);
 for(const user of [null,{...admin,id:'other'},{...admin,email:'other@example.com'},{...admin,role:'user'}])assert.equal(isPlatformSuperAdmin(user),false);
});
test('authority module copies remain identical for independently deployed functions',()=>{
 assert.equal(readFileSync(new URL('../base44/functions/platformAdmin/authority.mjs',import.meta.url),'utf8'),readFileSync(new URL('../base44/functions/getActiveOrganizationProfile/authority.mjs',import.meta.url),'utf8'));
});
test('anonymous and unrelated admin cannot read or mutate platform',async()=>{
 for(const user of [null,{id:'other',email:admin.email,role:'admin'},{...admin,role:'user'}]){
  const f=fake(user);const r=await handlePlatformAdmin(f.client,{action:'overview'});
  assert.ok([401,403].includes(r.status));assert.equal(f.writes.length,0);assert.equal(f.queries.length,0);
 }
});
test('capabilities reveals no data and has no writes',async()=>{
 const f=fake({id:'client',role:'user'});assert.deepEqual((await handlePlatformAdmin(f.client,{action:'capabilities'})).body,{is_super_admin:false});assert.equal(f.writes.length,0);
});
test('overview projects user fields and audits access',async()=>{
 const f=fake();const r=await handlePlatformAdmin(f.client,{action:'overview'});
 assert.equal(r.status,200);assert.equal(r.body.users[1].secret,undefined);assert.equal(f.tables.PlatformAuditEvent[0].action,'platform.overview.read');
});
test('overview pagination reports more instead of silently truncating',async()=>{
 const f=fake(admin,{User:Array.from({length:105},(_,i)=>({id:'u'+i,email:'a@b.com'}))});
 const r=await handlePlatformAdmin(f.client,{action:'overview'});assert.equal(r.body.users.length,100);assert.equal(r.body.next_skip,100);
 assert.equal((await handlePlatformAdmin(f.client,{action:'overview',skip:100})).body.users.length,5);
});
test('invalid overview offset is rejected before queries',async()=>{const f=fake();assert.equal((await handlePlatformAdmin(f.client,{action:'overview',skip:-1})).status,400);assert.equal(f.queries.length,0);});
test('create partner preserves defaults and never creates tenant ownership',async()=>{
 const f=fake();const r=await handlePlatformAdmin(f.client,{action:'create_organization',commercial_name:'Consulting',legal_name:'CC SA',email_main:'cc@example.com',organization_type:'partner'});
 assert.equal(r.status,200);assert.equal(r.body.organization.document_prefix_quote,'COT');assert.equal(f.tables.OrganizationMembership.length,0);assert.equal(f.tables.PlatformAuditEvent.length,2);
});
for(const changes of [{email_main:'bad'},{commercial_name:''},{organization_type:'anything'}]){
 test('invalid organization '+JSON.stringify(changes),async()=>{
  const f=fake();const r=await handlePlatformAdmin(f.client,{action:'create_organization',commercial_name:'A',legal_name:'A SA',email_main:'a@b.com',organization_type:'importer',...changes});
  assert.equal(r.status,400);assert.equal(f.writes.length,0);
 });
}
test('audit failure prevents a business mutation',async()=>{
 const f=fake();f.client.asServiceRole={entities:{...Object.fromEntries(['OrganizationProfile'].map(n=>[n,f.client.asServiceRole.entities[n]])),PlatformAuditEvent:{create:async()=>{throw new Error('audit unavailable');}}}};
 await assert.rejects(handlePlatformAdmin(f.client,{action:'set_organization_status',organization_id:'org',active:false}));
 assert.equal(f.tables.OrganizationProfile[0].active,true);assert.equal(f.writes.length,0);
});
test('classify an existing profile explicitly',async()=>{
 const f=fake();assert.equal((await handlePlatformAdmin(f.client,{action:'classify_organization',organization_id:'org',organization_type:'platform'})).status,200);
 assert.equal(f.tables.OrganizationProfile[0].organization_type,'platform');
});
test('suspend company records audit and changes only status',async()=>{
 const f=fake();assert.equal((await handlePlatformAdmin(f.client,{action:'set_organization_status',organization_id:'org',active:false})).status,200);
 assert.equal(f.tables.OrganizationProfile[0].active,false);assert.equal(f.tables.OrganizationProfile[0].commercial_name,'Importadora');
});
test('Super Admin cannot be accidentally assigned tenant ownership',async()=>{
 const f=fake();assert.equal((await handlePlatformAdmin(f.client,{action:'set_membership',organization_id:'org',user_id:admin.id,role:'owner'})).status,400);assert.equal(f.writes.length,0);
});
test('assign and revoke a registered client without changing platform role',async()=>{
 const f=fake();let r=await handlePlatformAdmin(f.client,{action:'set_membership',organization_id:'org',user_id:'client',role:'owner'});
 assert.equal(r.status,200);const membership=r.body.membership;
 r=await handlePlatformAdmin(f.client,{action:'revoke_membership',record_id:membership.id});
 assert.equal(r.status,200);assert.equal(f.tables.OrganizationMembership[0].status,'revoked');assert.equal(f.tables.User[1].role,'user');
});
test('unknown user is not invited or assigned',async()=>{
 const f=fake();assert.equal((await handlePlatformAdmin(f.client,{action:'set_membership',organization_id:'org',user_id:'unknown',role:'owner'})).status,404);assert.equal(f.writes.length,0);
});
test('membership expiry and invalid role rejected',async()=>{
 for(const changes of [{expires_at:'bad'},{expires_at:'1970-01-01Z'},{role:'super_admin'}]){
  const f=fake();assert.equal((await handlePlatformAdmin(f.client,{action:'set_membership',organization_id:'org',user_id:'client',role:'owner',...changes})).status,400);assert.equal(f.writes.length,0);
 }
});
test('suspended company cannot gain a new member',async()=>{
 const f=fake(admin,{OrganizationProfile:[{...importer,active:false}]});assert.equal((await handlePlatformAdmin(f.client,{action:'set_membership',organization_id:'org',user_id:'client',role:'owner'})).status,404);assert.equal(f.writes.length,0);
});
test('duplicate memberships fail instead of updating an arbitrary row',async()=>{
 const f=fake(admin,{OrganizationMembership:[{id:'m1',user_id:'client',organization_id:'org'},{id:'m2',user_id:'client',organization_id:'org'}]});
 assert.equal((await handlePlatformAdmin(f.client,{action:'set_membership',organization_id:'org',user_id:'client',role:'owner'})).status,409);assert.equal(f.writes.length,0);
});
test('grant permits only verified client operations and can be revoked',async()=>{
 const f=fake();let r=await handlePlatformAdmin(f.client,{action:'set_grant',partner_organization_id:'cc',client_organization_id:'org',permissions:['tracking.read'],operation_ids:['cargo']});
 assert.equal(r.status,200);
 assert.equal((await handlePlatformAdmin(f.client,{action:'revoke_grant',record_id:r.body.grant.id})).status,200);assert.equal(f.tables.PartnerAccessGrant[0].status,'revoked');
});
for(const changes of [{permissions:['finance.read']},{operation_ids:[]},{operation_ids:['unknown']},{partner_organization_id:'org'},{expires_at:'bad'}]){
 test('grant rejects '+JSON.stringify(changes),async()=>{
  const f=fake();const r=await handlePlatformAdmin(f.client,{action:'set_grant',partner_organization_id:'cc',client_organization_id:'org',permissions:['tracking.read'],operation_ids:['cargo'],...changes});
  assert.ok(r.status>=400);assert.equal(f.writes.length,0);
 });
}
test('cross-company or legacy unowned cargo cannot receive a grant',async()=>{
 for(const org of ['other',undefined]){
  const f=fake(admin,{ImportBatches:[{id:'cargo',organization_id:org}]});
  assert.equal((await handlePlatformAdmin(f.client,{action:'set_grant',partner_organization_id:'cc',client_organization_id:'org',permissions:['tracking.read'],operation_ids:['cargo']})).status,403);assert.equal(f.writes.length,0);
 }
});
test('legacy report detects unassigned and unknown company, without assigning',async()=>{
 const f=fake(admin,{InventoryUnits:[{id:'u1'},{id:'u2',organization_id:'bad'},{id:'u3',organization_id:'org'}]});
 const r=await handlePlatformAdmin(f.client,{action:'legacy_report'});
 assert.deepEqual(r.body.report.find(x=>x.entity==='InventoryUnits'),{entity:'InventoryUnits',total:3,unassigned:1,unknown_organization:1});
 assert.equal(f.writes.filter(x=>x.entity!=='PlatformAuditEvent').length,0);assert.equal(r.body.read_only,true);
});
test('Super Admin can read profile without a tenant membership and is audited',async()=>{
 const f=fake();const r=await getOrganizationProfile(f.client,'org');
 assert.equal(r.status,200);assert.equal(f.tables.OrganizationMembership.length,0);assert.equal(f.tables.PlatformAuditEvent[0].action,'organization.profile.read');
});
test('Super Admin must select company when several are active',async()=>{
 const f=fake();assert.equal((await getOrganizationProfile(f.client)).status,409);
});
test('other platform admin gains no profile bypass',async()=>{
 const f=fake({...admin,id:'other'});assert.equal((await getOrganizationProfile(f.client,'org')).status,403);
});
test('direct membership and grant mutations are restricted to server-only role',()=>{
 for(const name of ['OrganizationMembership','PartnerAccessGrant']){
  const s=JSON.parse(readFileSync(new URL('../base44/entities/'+name+'.jsonc',import.meta.url)));
  for(const op of ['create','update','delete'])assert.equal(s.rls[op].user_condition.role,'__server_only__');
 }
});

test('audit viewer is paginated and restricted to platform authority',async()=>{
 const f=fake();const result=await handlePlatformAdmin(f.client,{action:'audit_log',skip:0});
 assert.equal(result.status,200);assert.ok(result.body.events.some(x=>x.action==='platform.audit.read'));
 const outsider=fake({id:'client',role:'user'});assert.equal((await handlePlatformAdmin(outsider.client,{action:'audit_log'})).status,403);
});
