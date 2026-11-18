/**
 * Contratos de onboarding Nexora (sin cuentas ni datos reales).
 * Lee: organización del selector y bridge de entidades.
 * Escribe: nada; el gateway remoto se sustituye por un fake.
 * Regla: nunca asumir membresía, reintentar CRUD directo ni ampliar el scope al cambiar empresa.
 * Límite: estas pruebas NO certifican permisos o persistencia en API Base44 real.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createTenantBridge} from '../src/api/tenantBridge.mjs';
import {assertOrganizationContext, organizationContextMessage} from '../src/lib/organizationContext.mjs';

function harness(selectedOrganization = '') {
  const calls = [];
  const raw = {
    entities: {Suppliers: {create: () => {throw new Error('DIRECT_CRUD_FORBIDDEN');}}},
    functions: {invoke: async (name, payload) => {
      calls.push({name, payload});
      return {data: {result: {ok: true}}};
    }},
  };
  return {calls, bridge: createTenantBridge(raw, () => selectedOrganization)};
}

test('onboarding: ningún contexto de empresa inventa selección ni permisos', () => {
  assert.deepEqual(assertOrganizationContext({organizations: [], is_super_admin: false}).organizations, []);
  assert.throws(() => assertOrganizationContext({is_super_admin: true}), /INVALID_ORGANIZATION_CONTEXT/);
});

test('onboarding: 401, 403 y 404 tienen diagnósticos diferentes', () => {
  assert.match(organizationContextMessage({response: {status: 401}}), /sesión/);
  assert.match(organizationContextMessage({response: {status: 403}}), /no tiene acceso/);
  assert.match(organizationContextMessage({response: {status: 404}}), /No se encontró el servicio/);
});

test('onboarding: proveedor utiliza exclusivamente tenantData con empresa seleccionada', async () => {
  const h = harness('org-autorizada');
  await h.bridge.entities.Suppliers.create({name: 'Proveedor temporal'});
  assert.deepEqual(h.calls, [{
    name: 'tenantData',
    payload: {entity: 'Suppliers', method: 'create', args: [{name: 'Proveedor temporal'}], organization_id: 'org-autorizada'},
  }]);
});

test('onboarding: sin selección no fabrica un organization_id', async () => {
  const h = harness();
  await h.bridge.entities.Suppliers.list();
  assert.equal(Object.hasOwn(h.calls[0].payload, 'organization_id'), false);
});

test('onboarding: error de gateway impide éxito y fallback a CRUD directo', async () => {
  const raw = {
    entities: {Suppliers: {create: () => {throw new Error('DIRECT_CRUD_EXECUTED');}}},
    functions: {invoke: async () => ({data: {error: 'NO_ORGANIZATION_ACCESS'}})},
  };
  const bridge = createTenantBridge(raw, () => 'org-no-autorizada');
  await assert.rejects(bridge.entities.Suppliers.create({name: 'Prueba'}), /NO_ORGANIZATION_ACCESS/);
});

test('onboarding: operaciones no autorizadas por bridge se rechazan antes del gateway', async () => {
  const h = harness('org-autorizada');
  await assert.rejects(h.bridge.entities.Suppliers.bulkDelete(), /Operación no disponible/);
  assert.equal(h.calls.length, 0);
});

test('onboarding: CRM se enruta a moduleData conservando empresa', async () => {
  const h = harness('org-autorizada');
  await h.bridge.entities.CustomerProfiles.list();
  assert.equal(h.calls[0].name, 'moduleData');
  assert.equal(h.calls[0].payload.organization_id, 'org-autorizada');
});
