/**
 * distributeImportCosts
 *
 * ⚠️  LEGACY — DEPRECATED
 * ════════════════════════════════════════════════════════════════════════════
 * Esta función es LEGACY y NO debe usarse para nuevos flujos de costos.
 *
 * PROBLEMA ORIGINAL: Escribía directamente sobre real_unit_cost (campo legacy),
 * lo cual es incompatible con la arquitectura SOT v2 de NEXORA.
 *
 * ARQUITECTURA ACTUAL (SOT v2):
 *   - total_real_unit_cost = fuente oficial activa
 *   - InventoryUnitCostComponents = desglose de costos
 *   - Motor: calculateRealUnitCost + processRecalculationQueue
 *
 * COMPORTAMIENTO ACTUAL (neutralizado):
 *   - NO modifica real_unit_cost ni ningún campo de costo
 *   - Encola recálculo via enqueueRecalculation para cada unidad del batch
 *   - El motor nuevo toma control del recálculo proporcional
 *
 * MIGRACIÓN: Si este endpoint es llamado desde UI legacy, redirige
 * a enqueueRecalculation para cada unidad del ImportBatch.
 *
 * INPUT: { importBatchId }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { importBatchId } = await req.json();

  if (!importBatchId) {
    return Response.json({ error: 'importBatchId es requerido' }, { status: 400 });
  }

  console.warn(`[LEGACY_DEPRECATED] distributeImportCosts called for batch: ${importBatchId} | This function no longer writes cost fields directly. Redirecting to enqueueRecalculation for each unit in the batch.`);

  const batch = await base44.asServiceRole.entities.ImportBatches.get(importBatchId);
  if (!batch) {
    return Response.json({ error: 'ImportBatch no encontrado' }, { status: 404 });
  }

  // Obtener todas las unidades activas del batch (no sold)
  const units = await base44.asServiceRole.entities.InventoryUnits.filter({
    import_batch_id: importBatchId,
    status: { $in: ['available', 'reserved'] }
  });

  if (!units || units.length === 0) {
    return Response.json({
      success: true,
      legacy_deprecated: true,
      message: 'No hay unidades activas en este batch. Sin acción requerida.',
      enqueued: 0
    });
  }

  // Encolar recálculo para cada unidad — el motor SOT v2 calculará los costos correctamente
  const enqueueResults = [];
  for (const unit of units) {
    if (!unit?.id) continue;
    try {
      await base44.asServiceRole.functions.invoke('enqueueRecalculation', {
        inventory_unit_id: unit.id,
        trigger_source: 'distributeImportCosts_legacy_redirect',
        trigger_entity_type: 'ImportBatches',
        trigger_entity_id: importBatchId
      });
      enqueueResults.push({ unit_id: unit.id, result: 'enqueued' });
    } catch (err) {
      console.warn(`[LEGACY_DEPRECATED] distributeImportCosts: failed to enqueue unit ${unit.id}: ${err?.message}`);
      enqueueResults.push({ unit_id: unit.id, result: 'enqueue_failed', error: err?.message });
    }
  }

  const enqueuedCount = enqueueResults.filter(r => r.result === 'enqueued').length;

  return Response.json({
    success: true,
    legacy_deprecated: true,
    message: `DEPRECATED: distributeImportCosts ya no modifica costos directamente. Se encolaron ${enqueuedCount}/${units.length} unidades para recálculo via motor SOT v2.`,
    import_batch_id: importBatchId,
    units_found: units.length,
    enqueued: enqueuedCount,
    enqueue_results: enqueueResults
  });
});