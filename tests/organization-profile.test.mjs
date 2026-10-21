import test from 'node:test';
import assert from 'node:assert/strict';
import {getOrganizationProfile} from '../base44/functions/getActiveOrganizationProfile/handler.mjs';
const member={user_id:'u',organization_id:'a',role:'owner',status:'active'};
function fake(rows=[member],user={id:'u'}) {
 const calls=[];
 const c={auth:{me:async()=>user},asServiceRole:{entities:{
 OrganizationMembership:{filter:async query=>{calls.push(['members',query]);return rows;}},
 OrganizationProfile:{filter:async query=>{calls.push(['profile',query]);return [{id:query.id,active:true}];}}
 }}};
 return {c,calls};
}
test('owner profile query is scoped by record ID',async()=>{
 const {c,calls}=fake(); const r=await getOrganizationProfile(c);
 assert.equal(r.status,200);assert.deepEqual(calls[1],['profile',{id:'a',active:true}]);
});
test('other company denied before profile query',async()=>{
 const {c,calls}=fake();assert.equal((await getOrganizationProfile(c,'b')).status,403);assert.equal(calls.length,1);
});
test('legacy has no global fallback',async()=>{const {c,calls}=fake([]);assert.equal((await getOrganizationProfile(c)).status,403);assert.equal(calls.length,1);});
test('multiple companies require selection',async()=>{const {c}=fake([member,{...member,organization_id:'b'}]);assert.equal((await getOrganizationProfile(c)).status,409);assert.equal((await getOrganizationProfile(c,'b')).status,200);});
test('revoked expired and foreign memberships denied',async()=>{
 for(const changes of [{status:'revoked'},{expires_at:'bad'},{expires_at:'1970-01-01T00:00:01Z'},{user_id:'other'},{role:'buyer'},{role:'staff'}]){
 const {c}=fake([{...member,...changes}]);assert.equal((await getOrganizationProfile(c,'a',1000)).status,403);
 }
});
test('anonymous cannot query membership',async()=>{const {c,calls}=fake([],null);assert.equal((await getOrganizationProfile(c)).status,401);assert.equal(calls.length,0);});
test('invalid organization ID rejected',async()=>{const {c}=fake();assert.equal((await getOrganizationProfile(c,{})).status,400);});
