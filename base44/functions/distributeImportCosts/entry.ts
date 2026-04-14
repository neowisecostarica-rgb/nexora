/**
 * distributeImportCosts
 *
 * Distribuye costos de un ImportBatch proporcionalmente entre
 * las InventoryUnits vinculadas que NO estén vendidas.
 *
 * Schema v1.0 — SOLO escribe real_unit_cost.
 *
 * REGLAS CRÍTICAS:
 * - NUNCA modifica unidades con status "sold" (costo ya congelado en SaleItem)
 * - real_unit_cost = real_unit_cost actual + costo de importación prorrateado
 * - NO escribe ningún campo legacy (cost_import_unit, total_real_unit_cost, etc.)
 * - Después de actualizar real_unit_cost, el pricing se recalcula automáticamente
 *   vía la automation "Recalcular Pricing al Cambiar Costo Real"
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

  const batch = await base44.asServiceRole.entities.ImportBatches.get(importBatchId);
  if (!batch) {
    return Response.json({ error: 'ImportBatch no encontrado' }, { status: 404 });
  }

  // Solo unidades available o reserved — NUNCA sold (costo congelado)
  const units = await base44.asServiceRole.entities.InventoryUnits.filter({
    import_batch_id: importBatchId,
    status: { $in: ['available', 'reserved'] }
  });

  if (!units || units.length === 0) {
    return Response.json({
      success: true,
      message: 'No hay unidades activas vinculadas a este batch',
      updated: 0
    });
  }

  // Costo total de importación del batch
  const totalImportCost =
    (batch.customs_total          || 0) +
    (batch.freight_total          || 0) +
    (batch.local_transport_total  || 0) +
    (batch.extra_cost_total       || 0);

  if (totalImportCost <= 0) {
    return Response.json({
      success: true,
      message: 'El batch no tiene costos de importación registrados',
      updated: 0
    });
  }

  // Prorrateo equitativo entre unidades activas del batch
  const importCostPerUnit = totalImportCost / units.length;

  let updated = 0;
  const BATCH_SIZE = 20;

  for (let i = 0; i < units.length; i += BATCH_SIZE) {
    const batch_slice = units.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch_slice.map(async (unit) => {
        // real_unit_cost nuevo = costo base actual + porción de importación
        // Usamos real_unit_cost como SOT — no acumulamos sobre campos legacy
        const currentCost = unit.real_unit_cost || 0;
        const newCost = Math.round((currentCost + importCostPerUnit) * 100) / 100;

        await base44.asServiceRole.entities.InventoryUnits.update(unit.id, {
          real_unit_cost: newCost
        });
        updated++;
      })
    );
  }

  return Response.json({
    success: true,
    import_batch_id: importBatchId,
    total_import_cost: totalImportCost,
    import_cost_per_unit: Math.round(importCostPerUnit * 100) / 100,
    units_updated: updated
  });
});