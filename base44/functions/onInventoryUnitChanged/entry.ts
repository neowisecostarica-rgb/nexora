// ============================================================
// NEXORA — onInventoryUnitChanged
// Bloque P0.4 — Automation handler: InventoryUnits create/update
// ============================================================
//
// RESPONSABILIDAD:
//   Recibir evento de creación/actualización de InventoryUnit
//   y encolar el recálculo via enqueueRecalculation.
//
// IMPORTANTE:
//   NO llama calculateRealUnitCost directamente.
//   Solo encola via enqueueRecalculation.
// ============================================================

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const eventType = body?.event?.type || 'unknown';
    const entityId = body?.event?.entity_id || body?.data?.id || null;

    console.log(`[ON_UNIT_CHANGED] event: ${eventType} | entity_id: ${entityId}`);

    if (!entityId) {
      console.warn('[ON_UNIT_CHANGED] No entity_id in payload. Skipping.');
      return Response.json({ success: true, result: 'skipped_no_entity_id' });
    }

    // Encolar via función dedicada
    await base44.asServiceRole.functions.invoke('enqueueRecalculation', {
      inventory_unit_id: entityId,
      trigger_source: 'onInventoryUnitChanged',
      trigger_entity_type: 'InventoryUnits',
      trigger_entity_id: entityId
    });

    console.log(`[ON_UNIT_CHANGED] Enqueue invoked for unit ${entityId}`);
    return Response.json({ success: true, inventory_unit_id: entityId, result: 'enqueued' });

  } catch (error) {
    console.error('[ERROR] onInventoryUnitChanged failed:', error);
    return Response.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
});