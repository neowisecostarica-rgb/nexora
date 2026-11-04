/**
 * moduleData — gateway de datos para módulos satélite MB-48H.
 *
 * Propósito: dar acceso empresarial a Warehouses, ShipmentTrackings, CustomerProfiles y
 * CustomerInteractions sin modificar el allowlist canónico de tenantData (archivo de
 * plataforma no editable en rama).
 * Datos leídos/escritos: solo esas cuatro entidades, siempre filtradas por organization_id.
 * Dependencias: tenantData (method=context) reutiliza identidad, membresías owner, Super Admin
 * y auditoría de plataforma ya existentes. No se duplica la resolución de membresías.
 * Reglas que protege: denegación por defecto; sin entidad válida no hay operación; crea con
 * ownership validado; no permite cambiar organization_id ni campos de sistema; valida
 * referencias dentro de la misma empresa (cliente, bodega, lote/orden/unidad).
 * Límites: NO es una transacción atómica; la auditoría de Super Admin proviene de tenantData;
 * staff/buyer aún no tienen flujos de negocio habilitados por la política vigente.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ENTITIES = ['Warehouses', 'ShipmentTrackings', 'CustomerProfiles', 'CustomerInteractions'];
const OPS = ['list', 'filter', 'get', 'create', 'update', 'delete'];
const SYSTEM_FIELDS = ['id', 'created_by_id', 'created_by', 'created_date', 'updated_date'];
const REFERENCES = {
  CustomerProfiles: { customer_id: 'Customers' },
  CustomerInteractions: { customer_id: 'Customers' },
  ShipmentTrackings: { warehouse_id: 'Warehouses' },
};

class AccessError extends Error {
  constructor(code, status = 403) { super(code); this.status = status; this.code = code; }
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
    const client = createClientFromRequest(req);
    const user = await client.auth.me();
    if (!user?.id) throw new AccessError('UNAUTHORIZED', 401);

    let input;
    try { input = await req.json(); } catch { throw new AccessError('INVALID_JSON', 400); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AccessError('INVALID_JSON', 400);

    const name = input.entity;
    if (!ENTITIES.includes(name)) throw new AccessError('ENTITY_NOT_ALLOWED', 400);
    if (!OPS.includes(input.method)) throw new AccessError('INVALID_ENTITY_OPERATION', 400);
    const args = Array.isArray(input.args) ? input.args : [];
    if (args.length > 4) throw new AccessError('INVALID_ARGUMENTS', 400);
    if (['list', 'filter'].includes(input.method)) {
      const index = input.method === 'filter' ? 2 : 1;
      if (args[index] != null && (!Number.isInteger(args[index]) || args[index] < 1 || args[index] > 500)) throw new AccessError('INVALID_LIMIT', 400);
      if (args[index + 1] != null && (!Number.isInteger(args[index + 1]) || args[index + 1] < 0)) throw new AccessError('INVALID_OFFSET', 400);
    }

    // Contexto autorizado reutilizado del gateway existente (identidad + membresías + auditoría).
    const contextResponse = await client.functions.invoke('tenantData', { method: 'context' });
    const context = contextResponse?.data?.result;
    if (!context || !Array.isArray(context.organizations)) throw new AccessError('CONTEXT_UNAVAILABLE', 503);

    const allowedIds = context.organizations.map((o) => o.id);
    let organizationId = null;
    if (input.organization_id) {
      if (!allowedIds.includes(input.organization_id)) throw new AccessError('NO_ORGANIZATION_ACCESS');
      organizationId = input.organization_id;
    } else if (!context.is_super_admin) {
      if (allowedIds.length !== 1) throw new AccessError(allowedIds.length ? 'ORGANIZATION_REQUIRED' : 'OWNER_ACCESS_REQUIRED');
      organizationId = allowedIds[0];
    }
    // Una empresa aliada solo accede a operaciones autorizadas por partnerOverview.
    if (organizationId && context.organizations.some(o => o.id === organizationId && o.organization_type === 'partner')) throw new AccessError('PARTNER_PORTAL_ONLY', 403);
    const global = !organizationId;

    const raw = client.asServiceRole.entities;
    const scoped = (extra = {}) => (global ? extra : { $and: [{ organization_id: organizationId }, extra] });

    const exists = async (target, recordId) => {
      if (typeof recordId !== 'string' || !recordId.trim() || recordId.length > 200) throw new AccessError('INVALID_RECORD_ID', 400);
      const rows = await raw[target].filter(scoped({ id: recordId }), undefined, 2);
      if (rows.length !== 1 || rows[0].id !== recordId) throw new AccessError('RECORD_NOT_ACCESSIBLE', 404);
      return rows[0];
    };

    const validate = async (data, current = {}) => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new AccessError('INVALID_DATA', 400);
      if (Object.keys(data).some((k) => k.startsWith('$') || k.includes('.'))) throw new AccessError('INVALID_FIELD', 400);
      if (SYSTEM_FIELDS.some((k) => Object.hasOwn(data, k))) throw new AccessError('SYSTEM_FIELD_FORBIDDEN', 400);
      if (!global && data.organization_id != null && data.organization_id !== organizationId) throw new AccessError('OWNERSHIP_CHANGE_FORBIDDEN');
      const candidate = { ...current, ...data };
      for (const [field, target] of Object.entries(REFERENCES[name] || {})) {
        if (candidate[field] != null && candidate[field] !== '') await exists(target, candidate[field]);
      }
      // Un vínculo de seguimiento debe pertenecer a la empresa autorizada.
      if (name === 'ShipmentTrackings' && candidate.linked_entity_id) {
        if (!['ImportBatches', 'PurchaseOrders', 'InventoryUnits'].includes(candidate.linked_entity_type)) throw new AccessError('INVALID_TRACKING_LINK', 400);
        await exists(candidate.linked_entity_type, candidate.linked_entity_id);
      }
    };

    let result;
    switch (input.method) {
      case 'list':
        result = await raw[name].filter(scoped({}), args[0], args[1], args[2]);
        break;
      case 'filter':
        result = await raw[name].filter(scoped(args[0] || {}), args[1], args[2], args[3]);
        break;
      case 'get':
        result = await exists(name, args[0]);
        break;
      case 'create': {
        const data = args[0];
        await validate(data);
        if (global && (typeof data?.organization_id !== 'string' || !allowedIds.includes(data.organization_id))) throw new AccessError('ORGANIZATION_REQUIRED_FOR_CREATE', 400);
        result = await raw[name].create({ ...data, organization_id: global ? data.organization_id : organizationId });
        break;
      }
      case 'update': {
        const current = await exists(name, args[0]);
        const data = args[1] || {};
        if (Object.hasOwn(data, 'organization_id') && data.organization_id !== current.organization_id) throw new AccessError('OWNERSHIP_CHANGE_FORBIDDEN');
        await validate(data, current);
        result = await raw[name].update(args[0], data);
        break;
      }
      case 'delete':
        await exists(name, args[0]);
        result = await raw[name].delete(args[0]);
        break;
    }
    return Response.json({ result });
  } catch (e) {
    const status = Number.isInteger(e?.status) && e.status >= 400 && e.status < 500 ? e.status : 500;
    return Response.json({ error: status === 500 ? 'DATA_OPERATION_FAILED' : (e.code || 'ACCESS_DENIED') }, { status });
  }
});