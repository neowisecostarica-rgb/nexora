/**
 * NEXORA — MAPA PARA DESARROLLADORES
 * Propósito: Traduce cambios del lote de importación en solicitudes de recálculo.
 * Datos/efectos detectados: InventoryUnits.filter
 * Dependencias: enqueueRecalculation
 * Límites: Preservar contratos; ver docs/NEXORA-REGRESSION-MATRIX.md. Runtime no certificado.
 * Referencia: docs/NEXORA-INVENTORY.md (base 54e8532).
 */
// ============================================================
// NEXORA — onImportBatchChanged
// Bloque P0.4 — Automation handler: ImportBatches create/update
// ============================================================
//
// RESPONSABILIDAD:
//   Recibir evento de creación/actualización de ImportBatch,
//   identificar todas las InventoryUnits vinculadas,
//   y encolar el recálculo de cada una via enqueueRecalculation.
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
    const batchId = body?.event?.entity_id || body?.data?.id || null;

    console.log(`[ON_BATCH_CHANGED] event: ${eventType} | batch_id: ${batchId}`);

    if (!batchId) {
      console.warn('[ON_BATCH_CHANGED] No entity_id in payload. Skipping.');
      return Response.json({ success: true, result: 'skipped_no_entity_id' });
    }

    // Obtener todas las InventoryUnits vinculadas a este batch
    const affectedUnits = await base44.asServiceRole.entities.InventoryUnits.filter({
      import_batch_id: batchId
    });

    if (!affectedUnits || affectedUnits.length === 0) {
      console.log(`[ON_BATCH_CHANGED] No InventoryUnits found for batch ${batchId}. Nothing to enqueue.`);
      return Response.json({ success: true, result: 'no_units_found', batch_id: batchId });
    }

    console.log(`[ON_BATCH_CHANGED] Found ${affectedUnits.length} units for batch ${batchId}. Enqueuing...`);

    const enqueueResults = [];

    for (const unit of affectedUnits) {
      if (!unit?.id) continue;

      // Saltar unidades vendidas (costo congelado)
      if (unit.status === 'sold') {
        console.log(`[ON_BATCH_CHANGED] Skipping sold unit ${unit.id}`);
        enqueueResults.push({ unit_id: unit.id, result: 'skipped_sold' });
        continue;
      }

      try {
        await base44.asServiceRole.functions.invoke('enqueueRecalculation', {
          inventory_unit_id: unit.id,
          trigger_source: 'onImportBatchChanged',
          trigger_entity_type: 'ImportBatches',
          trigger_entity_id: batchId
        });
        enqueueResults.push({ unit_id: unit.id, result: 'enqueued' });
        console.log(`[ON_BATCH_CHANGED] Enqueued unit ${unit.id}`);
      } catch (enqueueError) {
        console.warn(`[ON_BATCH_CHANGED] Failed to enqueue unit ${unit.id}:`, enqueueError?.message);
        enqueueResults.push({ unit_id: unit.id, result: 'enqueue_failed', error: enqueueError?.message });
      }
    }

    return Response.json({
      success: true,
      batch_id: batchId,
      units_found: affectedUnits.length,
      enqueue_results: enqueueResults
    });

  } catch (error) {
    console.error('[ERROR] onImportBatchChanged failed:', error);
    return Response.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
});