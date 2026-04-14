/**
 * recalculatePricingOnCostChange
 *
 * Automation handler: se dispara cuando cambia real_unit_cost o
 * assigned_pricing_profile_id en InventoryUnits.
 * Delega el cálculo a calculateAndCachePricing.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const payload = await req.json();
  const entity_id = payload?.event?.entity_id;

  if (!entity_id) {
    return Response.json({ error: 'entity_id no encontrado en el payload' }, { status: 400 });
  }

  // Unidades vendidas no se recalculan
  const unit = payload?.data;
  if (unit?.status === 'sold') {
    return Response.json({ skipped: true, reason: 'Unidad ya vendida' });
  }

  const result = await base44.asServiceRole.functions.invoke('calculateAndCachePricing', {
    inventory_unit_id: entity_id
  });

  return Response.json({ success: true, entity_id, result });
});