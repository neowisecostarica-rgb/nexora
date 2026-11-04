import test from 'node:test';
import assert from 'node:assert/strict';
import {organizationContextMessage,assertOrganizationContext} from '../src/lib/organizationContext.mjs';

test('company selector distinguishes session, permission and missing endpoint',()=>{
 assert.match(organizationContextMessage({response:{status:401}}),/sesión/);
 assert.match(organizationContextMessage({response:{status:403}}),/no tiene acceso/);
 assert.match(organizationContextMessage({response:{status:404}}),/No se encontró/);
});
test('company selector refuses missing or malformed context',()=>{
 assert.throws(()=>assertOrganizationContext(undefined),/INVALID_ORGANIZATION_CONTEXT/);
 assert.throws(()=>assertOrganizationContext({organizations:null}),/INVALID_ORGANIZATION_CONTEXT/);
 assert.deepEqual(assertOrganizationContext({organizations:[],is_super_admin:false}).organizations,[]);
});
