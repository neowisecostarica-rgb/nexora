/**
 * Consulta limitada para aliados Consulting. No usa tenantData ni CRUD transversal:
 * autoriza con membresía y grant en servidor y devuelve solo campos permitidos.
 * Ningún importe, contacto, documento privado o valor financiero sale de aquí.
 */
const fail = (status, error) => ({status, body:{error}});
const id = v => typeof v === 'string' && v.length > 0 && v.length <= 200;
const live = (row, now) => row?.status === 'active' && (!row.expires_at || (Number.isFinite(Date.parse(row.expires_at)) && Date.parse(row.expires_at) > now));
const PUBLIC_STATUS = new Set(['planning','shipped','in_customs','delivered','closed']);
const TRACKING_STATUS = new Set(['label_created','in_transit','customs','out_for_delivery','delivered','exception','returned']);

export async function handlePartnerOverview(client, input = {}, now = Date.now()) {
  const user = await client.auth.me();
  if (!id(user?.id)) return fail(401,'UNAUTHORIZED');
  if (input.action !== 'overview') return fail(400,'INVALID_ACTION');
  const db = client.asServiceRole.entities;
  const memberships = await db.OrganizationMembership.filter({user_id:user.id,status:'active'},undefined,100);
  if (!Array.isArray(memberships) || memberships.length === 100) return fail(409,'MEMBERSHIP_LIMIT');
  const partners = [];
  for (const m of memberships.filter(row=>row.user_id===user.id && live(row,now) && row.role==='owner' && id(row.organization_id))) {
    const orgs = await db.OrganizationProfile.filter({id:m.organization_id,active:true},undefined,2);
    if (orgs.length === 1 && orgs[0].id === m.organization_id && orgs[0].organization_type === 'partner') partners.push(m.organization_id);
  }
  const partnerIds = [...new Set(partners)];
  if (partnerIds.length === 0) return fail(403,'PARTNER_ACCESS_REQUIRED');
  const selected = input.partner_organization_id || (partnerIds.length === 1 ? partnerIds[0] : null);
  if (!selected || !partnerIds.includes(selected)) return fail(403,'PARTNER_SELECTION_REQUIRED');
  const grants = await db.PartnerAccessGrant.filter({partner_organization_id:selected,status:'active'},undefined,200);
  if (!Array.isArray(grants) || grants.length === 200) return fail(409,'GRANT_LIMIT');
  const operations = [], seen = new Set();
  for (const g of grants) {
    if (g.partner_organization_id !== selected || !live(g,now) || !id(g.client_organization_id) || !Array.isArray(g.permissions) || !g.permissions.includes('operations.read') || !Array.isArray(g.operation_ids) || !g.operation_ids.length || g.operation_ids.length > 200) continue;
    const customers=await db.OrganizationProfile.filter({id:g.client_organization_id,active:true},undefined,2);
    if (customers.length !== 1 || customers[0].id!==g.client_organization_id || customers[0].organization_type!=='importer') continue;
    for (const batchId of g.operation_ids) {
      if (!id(batchId) || seen.has(batchId)) continue;
      // Un ID del grant no basta; verificar ownership persistido por cada carga.
      const batches=await db.ImportBatches.filter({id:batchId,organization_id:g.client_organization_id},undefined,2);
      if (batches.length!==1 || batches[0].id!==batchId || batches[0].organization_id!==g.client_organization_id) continue;
      seen.add(batchId);
      const b=batches[0];
      const row={
        id:b.id,client_name:customers[0].commercial_name||'Cliente',batch_code:b.batch_code||'Sin código',
        status:PUBLIC_STATUS.has(b.status)?b.status:'unknown',
        ship_date:b.ship_date||null,arrival_date:b.arrival_date||null,
        trackings:[]
      };
      if (g.permissions.includes('tracking.read')) {
        const ts=await db.ShipmentTrackings.filter({organization_id:g.client_organization_id,linked_entity_type:'ImportBatches',linked_entity_id:b.id},'-updated_date',100);
        row.trackings=(ts||[]).filter(t=>t.organization_id===g.client_organization_id && t.linked_entity_type==='ImportBatches' && t.linked_entity_id===b.id).map(t=>({
          tracking_number:t.tracking_number||'',courier:t.courier||'',
          status:TRACKING_STATUS.has(t.status)?t.status:'unknown',
          expected_date:t.expected_date||null,last_event:t.last_event||''
        }));
      }
      operations.push(row);
    }
  }
  return {status:200,body:{partner_organizations:partnerIds,partner_organization_id:selected,operations,read_only:true}};
}
