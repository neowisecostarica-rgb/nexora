/**
 * NEXORA — MAPA PARA DESARROLLADORES
 * Propósito: Traduce cambios de unidad en solicitudes de recálculo.
 * Datos/efectos detectados: Sin acceso directo SDK a entidades detectado.
 * Dependencias: enqueueRecalculation
 * Límites: Preservar contratos; ver docs/NEXORA-REGRESSION-MATRIX.md. Runtime no certificado.
 * Referencia: docs/NEXORA-INVENTORY.md (base 54e8532).
 */
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
import {clientForRequest} from './tenant-access.mjs';

Deno.serve(async (req) => {
  try {
    // MG01: scope SDK entity operations before legacy logic runs.
    const rawClient = createClientFromRequest(req);
    let base44;
    try { base44 = await clientForRequest(rawClient, req); }
    catch (error) {
      return Response.json({error: error.code || 'TENANT_ACCESS_DENIED'}, {status: error.status || 403});
    }
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