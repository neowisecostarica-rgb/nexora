import test from 'node:test';
import assert from 'node:assert/strict';
import {handlePartnerOverview} from '../base44/functions/partnerOverview/handler.mjs';

function fixture({userId='partner-user',grantStatus='active',batchOrg='client-1',membershipRole='owner'}={}) {
 const entries={
  OrganizationMembership:[{user_id:'partner-user',organization_id:'partner-1',role:membershipRole,status:'active'}],
  OrganizationProfile:[
   {id:'partner-1',active:true,organization_type:'partner',commercial_name:'Consulting QA'},
   {id:'client-1',active:true,organization_type:'importer',commercial_name:'Cliente QA'}
  ],
  PartnerAccessGrant:[{partner_organization_id:'partner-1',client_organization_id:'client-1',status:grantStatus,permissions:['operations.read','tracking.read'],operation_ids:['batch-1']}],
  ImportBatches:[{id:'batch-1',organization_id:batchOrg,batch_code:'QA-1',status:'shipped',ship_date:'2026-11-04',freight_total:1000}],
  ShipmentTrackings:[{id:'track-1',organization_id:'client-1',linked_entity_type:'ImportBatches',linked_entity_id:'batch-1',status:'in_transit',tracking_number:'QA-TRACK',courier:'QA courier',last_event:'PRIVATE FINANCIAL NOTE'}]
 };
 const entities={};
 for(const [name,records] of Object.entries(entries)) entities[name]={filter:async(query)=>records.filter(row=>Object.entries(query||{}).every(([key,value])=>row[key]===value))};
 return {auth:{me:async()=>userId?{id:userId}:null},asServiceRole:{entities}};
}
test('Consulting cannot read without authenticated identity',async()=>{
 const result=await handlePartnerOverview(fixture({userId:null}),{action:'overview'});
 assert.equal(result.status,401);
});
test('revoked grant and foreign-owned cargo never enter Consulting response',async()=>{
 const revoked=await handlePartnerOverview(fixture({grantStatus:'revoked'}),{action:'overview'});
 assert.deepEqual(revoked.body.operations,[]);
 const foreign=await handlePartnerOverview(fixture({batchOrg:'other-tenant'}),{action:'overview'});
 assert.deepEqual(foreign.body.operations,[]);
});
test('partner must be owner with active membership',async()=>{
 const result=await handlePartnerOverview(fixture({membershipRole:'staff'}),{action:'overview'});
 assert.equal(result.status,403);
});
test('response reveals authorized tracking only and strips financial/free-text fields',async()=>{
 const result=await handlePartnerOverview(fixture(),{action:'overview'});
 assert.equal(result.status,200);
 assert.equal(result.body.read_only,true);
 assert.equal(result.body.operations.length,1);
 assert.equal(result.body.operations[0].trackings.length,1);
 assert.equal(result.body.operations[0].trackings[0].tracking_number,'QA-TRACK');
 assert.ok(!JSON.stringify(result.body).includes('PRIVATE FINANCIAL NOTE'));
 assert.ok(!JSON.stringify(result.body).includes('freight_total'));
});
