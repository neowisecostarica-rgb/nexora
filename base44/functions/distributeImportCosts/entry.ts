import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Distribuye costos de ImportBatch a InventoryUnits vinculadas.
// Invocado por automatización on_update de ImportBatches.
// NO modifica unidades con status "sold" (costo ya congelado).

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

  // Obtener unidades vinculadas que NO estén vendidas (no tocar historial)
  const units = await base44.asServiceRole.entities.InventoryUnits.filter({
    import_batch_id: importBatchId,
    status: { $in: ['available', 'reserved', 'quoted', 'warranty', 'damaged'] }
  });

  if (units.length === 0) {
    return Response.json({ message: 'No hay unidades activas vinculadas a este batch', updated: 0 });
  }

  // Costo total del batch = suma de todos los costos de importación
  const totalImportCost = (batch.customs_total || 0) +
    (batch.freight_total || 0) +
    (batch.local_transport_total || 0) +
    (batch.extra_cost_total || 0);

  // Prorrateo por cantidad de unidades activas vinculadas
  const costPerUnit = totalImportCost / units.length;

  let updated = 0;
  for (const unit of units) {
    const newTotalCost = (unit.cost_purchase_unit || 0) +
      costPerUnit +
      (unit.cost_repair_unit || 0) +
      (unit.cost_local_unit || 0);

    await base44.asServiceRole.entities.InventoryUnits.update(unit.id, {
      cost_import_unit: costPerUnit,
      total_real_unit_cost: newTotalCost
    });
    updated++;
  }

  return Response.json({ success: true, updated, cost_per_unit: costPerUnit, total_import_cost: totalImportCost });
});