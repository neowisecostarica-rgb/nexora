/**
 * NEXORA — MAPA PARA DESARROLLADORES
 * Propósito: Política pura de permisos por empresa, rol, destinatario y autorización de aliado; sus entradas deben cargarse en servidor.
 * Datos/efectos detectados: Sin acceso directo SDK a entidades detectado.
 * Dependencias: Revisar imports y consumidores; sin invoke literal detectado.
 * Límites: Preservar contratos; ver docs/NEXORA-REGRESSION-MATRIX.md. Runtime no certificado.
 * Referencia: docs/NEXORA-INVENTORY.md (base 54e8532).
 */
/**
 * Pure server authorization policy. Caller must derive userId from auth and
 * load memberships, grants and resource from trusted storage, never request data.
 * Does not replace entity RLS or enforce itself on existing endpoints.
 */
const roles = {
 owner: ['organization.read','organization.manage','finance.read','finance.write','operations.read','operations.write','tracking.read','tracking.write','documents.read','documents.write'],
 staff: ['operations.read','operations.write','tracking.read','tracking.write','documents.read','documents.write'],
 buyer: ['tracking.read','documents.read']
};
const kinds = {organization:['organization.read','organization.manage'],finance:['finance.read','finance.write'],operation:['operations.read','operations.write'],tracking:['tracking.read','tracking.write'],document:['documents.read','documents.write']};
const partnerPermissions = new Set(roles.staff);
export function canAccess({userId,organizationId,action,resource,memberships=[],grants=[],now=Date.now()}) {
 if (!userId || !organizationId || !resource || resource.organization_id !== organizationId || !Number.isFinite(now)) return false;
 if (!kinds[resource.kind]?.includes(action)) return false;
 const active = r => r.status === 'active' && (r.expires_at == null || (Number.isFinite(Date.parse(r.expires_at)) && Date.parse(r.expires_at) > now));
 const mine = memberships.filter(m => m.user_id === userId && active(m));
 if (mine.some(m => m.organization_id === organizationId && roles[m.role]?.includes(action) &&
   (m.role !== 'buyer' || (resource.visibility === 'buyer' && Array.isArray(resource.buyer_user_ids) && resource.buyer_user_ids.includes(userId))))) return true;
 if (!partnerPermissions.has(action) || resource.visibility !== 'partner') return false;
 return grants.some(g => active(g) && g.client_organization_id === organizationId &&
  Array.isArray(g.permissions) && g.permissions.includes(action) &&
  mine.some(m => m.organization_id === g.partner_organization_id && ['owner','staff'].includes(m.role)) &&
  Array.isArray(g.operation_ids) && !!resource.operation_id && g.operation_ids.includes(resource.operation_id));
}
