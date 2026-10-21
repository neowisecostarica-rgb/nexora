/**
 * NEXORA — MAPA PARA DESARROLLADORES
 * Propósito: Resolve company profile from authenticated identity and server memberships. Organization IDs are OrganizationProfile record IDs. No global active-profile fallback.
 * Datos/efectos detectados: OrganizationMembership.filter, OrganizationProfile.filter
 * Dependencias: Revisar imports y consumidores; sin invoke literal detectado.
 * Límites: Preservar contratos; ver docs/NEXORA-REGRESSION-MATRIX.md. Runtime no certificado. Gustavo es Super Admin; owner-only requiere corrección y migración.
 * Referencia: docs/NEXORA-INVENTORY.md (base 54e8532).
 */
/**
 * Resolve company profile from authenticated identity and server memberships.
 * Organization IDs are OrganizationProfile record IDs. No global active-profile fallback.
 * Legacy users without memberships fail closed until migration is completed.
 */
export async function getOrganizationProfile(client, requestedId, now = Date.now()) {
 const user = await client.auth.me();
 if (!user?.id) return {status:401,body:{error:'Unauthorized'}};
 if (requestedId != null && (typeof requestedId !== 'string' || !requestedId.trim())) return {status:400,body:{error:'INVALID_ORGANIZATION'}};
 // Only owners may read the full profile, which contains banking details.
 const rows = await client.asServiceRole.entities.OrganizationMembership.filter({user_id:user.id,status:'active',role:'owner'},undefined,500);
 const owners = (rows || []).filter(m => m.user_id === user.id && m.status === 'active' && m.role === 'owner' && typeof m.organization_id === 'string' && m.organization_id &&
  (m.expires_at == null || (Number.isFinite(Date.parse(m.expires_at)) && Date.parse(m.expires_at) > now)));
 const ids = [...new Set(owners.map(m => m.organization_id))];
 const organizationId = requestedId || (ids.length === 1 ? ids[0] : null);
 if (!organizationId) return {status:ids.length > 1 ? 409 : 403,body:{error:ids.length > 1 ? 'ORGANIZATION_REQUIRED' : 'NO_ORGANIZATION_ACCESS'}};
 if (!ids.includes(organizationId)) return {status:403,body:{error:'NO_ORGANIZATION_ACCESS'}};
 const profiles = await client.asServiceRole.entities.OrganizationProfile.filter({id:organizationId,active:true},undefined,2);
 if (!profiles?.length) return {status:404,body:{error:'NO_PROFILE'}};
 if (profiles.length !== 1 || profiles[0].id !== organizationId || profiles[0].active !== true) return {status:409,body:{error:'INVALID_PROFILE'}};
 const profile = profiles[0];
 const required=['legal_name','commercial_name','email_main','document_prefix_quote','document_prefix_sale','quote_validity_days'];
 const missing_fields=required.filter(k=>!profile[k]);
 return {status:200,body:{profile,is_complete:missing_fields.length === 0,missing_fields}};
}
