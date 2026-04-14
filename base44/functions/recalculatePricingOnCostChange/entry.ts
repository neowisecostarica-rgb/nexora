import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Automation: se dispara cuando cambia el costo real de una InventoryUnit.
// Invoca calculateAndCachePricing para mantener precios sincronizados con costos.
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const payload = await req.json();
  const entityId = payload?.event?.entity_id;

  if (!entityId) {
    return Response.json({ error: 'entity_id no encontrado en el payload' }, { status: 400 });
  }

  // Solo recalcular si la unidad tiene pricing_profile_id asignado
  const unit = payload?.data;
  if (!unit?.pricing_profile_id) {
    return Response.json({ skipped: true, reason: 'Sin pricing_profile_id, no se recalcula.' });
  }

  // Invocar calculateAndCachePricing
  const result = await base44.asServiceRole.functions.invoke('calculateAndCachePricing', {
    inventoryUnitId: entityId
  });

  return Response.json({ success: true, entityId, pricing_result: result });
});