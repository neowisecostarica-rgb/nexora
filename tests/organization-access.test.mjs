import test from 'node:test';
import assert from 'node:assert/strict';
import {canAccess} from '../base44/policies/organization-access.mjs';
const owner={user_id:'u',organization_id:'a',role:'owner',status:'active'};
const partner={user_id:'u',organization_id:'cc',role:'staff',status:'active'};
const grant={partner_organization_id:'cc',client_organization_id:'a',status:'active',permissions:['tracking.write'],operation_ids:['op1']};
const resource={organization_id:'a',kind:'tracking',visibility:'partner',operation_id:'op1'};
const base={userId:'u',organizationId:'a',action:'tracking.read',resource,memberships:[owner],now:1000};
const checks=[
['owner own company',{},true],
['other company resource',{resource:{...resource,organization_id:'b'}},false],
['other company context',{organizationId:'b',resource:{...resource,organization_id:'b'}},false],
['missing ownership',{resource:{kind:'tracking'}},false],
['anonymous',{userId:null},false],
['unknown action',{action:'unknown'},false],
['wrong resource kind',{action:'finance.read'},false],
['revoked member',{memberships:[{...owner,status:'revoked'}]},false],
['expired member',{memberships:[{...owner,expires_at:'1970-01-01T00:00:01Z'}]},false],
['unknown role',{memberships:[{...owner,role:'admin'}]},false],
['staff finance',{memberships:[{...owner,role:'staff'}],action:'finance.read',resource:{...resource,kind:'finance'}},false],
['buyer own published tracking',{memberships:[{...owner,role:'buyer'}],resource:{...resource,visibility:'buyer',buyer_user_ids:['u']}},true],
['buyer other recipient',{memberships:[{...owner,role:'buyer'}],resource:{...resource,visibility:'buyer',buyer_user_ids:['other']}},false],
['buyer internal document',{memberships:[{...owner,role:'buyer'}],action:'documents.read',resource:{...resource,kind:'document',visibility:'internal',buyer_user_ids:['u']}},false],
['partner permitted operation',{memberships:[partner],grants:[grant],action:'tracking.write'},true],
['partner other operation',{memberships:[partner],grants:[grant],action:'tracking.write',resource:{...resource,operation_id:'op2'}},false],
['revoked grant',{memberships:[partner],grants:[{...grant,status:'revoked'}],action:'tracking.write'},false],
['expired grant',{memberships:[partner],grants:[{...grant,expires_at:'1970-01-01T00:00:01Z'}],action:'tracking.write'},false],
['invalid expiry',{memberships:[partner],grants:[{...grant,expires_at:'bad'}],action:'tracking.write'},false],
['partner finance even with explicit permission',{memberships:[partner],grants:[{...grant,permissions:['finance.read']}],action:'finance.read',resource:{...resource,kind:'finance'}},false],
['partner internal tracking',{memberships:[partner],grants:[grant],action:'tracking.write',resource:{...resource,visibility:'internal'}},false],
['missing operation scope',{memberships:[partner],grants:[{...grant,operation_ids:undefined}],action:'tracking.write'},false],
['empty operation scope',{memberships:[partner],grants:[{...grant,operation_ids:[]}],action:'tracking.write'},false],
['grant without membership',{memberships:[],grants:[grant],action:'tracking.write'},false]
];
for (const [name,changes,expected] of checks) test(name,()=>assert.equal(canAccess({...base,...changes}),expected));

test('prototype names deny access without throwing',()=>{
 for(const role of ['constructor','toString','__proto__'])assert.equal(canAccess({...base,memberships:[{...owner,role}]}),false);
 for(const kind of ['constructor','toString','__proto__'])assert.equal(canAccess({...base,resource:{...resource,kind}}),false);
});
