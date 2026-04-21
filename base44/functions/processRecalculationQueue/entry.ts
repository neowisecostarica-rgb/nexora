// ============================================================
// NEXORA — processRecalculationQueue
// Bloque P0.4 — Orquestación Cost Engine
// Bloque P0.5 — Motor de costos inlinado (evita function-to-function 403)
// ============================================================
//
// RESPONSABILIDAD:
//   Worker central que procesa la RecalculationQueue.
//   Toma registros pending cuyo scheduled_for ya venció
//   y ejecuta el motor de costos directamente (inlinado).
//
// POR QUÉ INLINADO:
//   Base44 no propaga credenciales suficientes en invocaciones
//   function-to-function cuando el caller es scheduler/automation
//   (sin token de usuario). El motor está inlinado para evitar
//   el 403 que ocurre al invocar calculateRealUnitCost remotamente.
//   calculateRealUnitCost sigue existiendo para invocación directa.
//
// EJECUCIÓN:
//   - Llamado por automation scheduled (cada 5 min)
//   - Invocable manualmente por admin desde el dashboard
//   - Seguro para ejecuciones concurrentes (status processing = lock lógico)
//
// LOTE: Máximo MAX_BATCH_SIZE registros por ejecución.
//       Un fallo individual NO detiene el lote.
// ============================================================

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MAX_BATCH_SIZE = 10;

// ── Utilidades del motor de costos ──

function round2(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return 0;
  return parseFloat(num.toFixed(2));
}

function sumCostPurchaseUnits(units = []) {
  return units.reduce((acc, u) => acc + Number(u.cost_purchase_unit || 0), 0);
}

function isValidOrgId(orgId) {
  return typeof orgId === 'string' && orgId.trim().length > 0;
}

// ── Motor de costos (inlinado desde calculateRealUnitCost) ──

async function runCostEngine(db, inventoryUnitId, organizationId) {
  // Cargar unidad
  const unit = await db.entities.InventoryUnits.get(inventoryUnitId);
  if (!unit) return { success: false, error: `InventoryUnit not found: ${inventoryUnitId}` };

  // Validar organization_id
  if (!isValidOrgId(unit.organization_id)) {
    return { success: false, error: 'INVALID_ORGANIZATION_ID', message: 'InventoryUnit must have a valid organization_id' };
  }
  if (unit.organization_id !== organizationId) {
    return { success: false, error: 'ORGANIZATION_MISMATCH' };
  }

  // Unidades vendidas: costo congelado
  if (unit.status === 'sold') {
    return {
      success: true,
      status: 'skipped_sold',
      total_real_unit_cost: round2(unit.total_real_unit_cost || 0),
      components_created: 0
    };
  }

  const costPurchaseUnit = Number(unit.cost_purchase_unit || 0);
  if (costPurchaseUnit <= 0) {
    return { success: false, error: 'cost_purchase_unit is missing or zero' };
  }

  // Borrar componentes previos (idempotencia)
  const existing = await db.entities.InventoryUnitCostComponents.filter({ inventory_unit_id: inventoryUnitId });
  for (const comp of (existing || [])) {
    await db.entities.InventoryUnitCostComponents.delete(comp.id);
  }
  console.log(`[ENGINE] Deleted ${existing?.length || 0} existing components for unit ${inventoryUnitId}`);

  const componentsToCreate = [];
  const warnings = [];

  // COMPONENTE 1: Costo base de compra
  componentsToCreate.push({
    organization_id: organizationId,
    inventory_unit_id: inventoryUnitId,
    cost_component_key: 'purchase_base',
    amount: round2(costPurchaseUnit),
    metadata: { source_type: 'InventoryUnit', source_id: inventoryUnitId, notes: 'Base purchase cost' }
  });

  // COMPONENTE 2: Costos de ImportBatch (proporcional)
  if (unit.import_batch_id) {
    const importBatch = await db.entities.ImportBatches.get(unit.import_batch_id);
    if (importBatch) {
      const batchUnits = await db.entities.InventoryUnits.filter({ import_batch_id: unit.import_batch_id });
      const totalBatchPurchaseCost = sumCostPurchaseUnits(batchUnits);

      if (totalBatchPurchaseCost > 0) {
        const proportionFactor = costPurchaseUnit / totalBatchPurchaseCost;
        const batchCostFields = [
          { key: 'import_customs',        field: 'customs_total',         label: 'Customs duty from import batch' },
          { key: 'import_freight',         field: 'freight_total',         label: 'Freight cost from import batch' },
          { key: 'import_local_transport', field: 'local_transport_total', label: 'Local transport from import batch' },
          { key: 'import_extra',           field: 'extra_cost_total',      label: 'Extra costs from import batch' },
        ];

        for (const { key, field, label } of batchCostFields) {
          const batchFieldAmount = Number(importBatch[field] || 0);
          if (batchFieldAmount > 0) {
            const allocatedAmount = round2(batchFieldAmount * proportionFactor);
            if (allocatedAmount > 0) {
              componentsToCreate.push({
                organization_id: organizationId,
                inventory_unit_id: inventoryUnitId,
                cost_component_key: key,
                amount: allocatedAmount,
                metadata: {
                  source_type: 'ImportBatch',
                  source_id: unit.import_batch_id,
                  notes: label,
                  proportion_factor: round2(proportionFactor),
                  batch_total_purchase_cost: round2(totalBatchPurchaseCost)
                }
              });
            }
          }
        }

        const perUnitDefault = Number(importBatch.per_unit_import_default || 0);
        if (perUnitDefault > 0) {
          componentsToCreate.push({
            organization_id: organizationId,
            inventory_unit_id: inventoryUnitId,
            cost_component_key: 'import_per_unit_fixed',
            amount: round2(perUnitDefault),
            metadata: { source_type: 'ImportBatch', source_id: unit.import_batch_id, notes: 'Fixed per-unit import cost' }
          });
        }
      } else {
        const msg = `ImportBatch ${unit.import_batch_id} has no units with valid cost_purchase_unit. Import costs skipped.`;
        console.warn(`[ENGINE][WARN] ${msg}`);
        warnings.push(msg);
      }
    } else {
      const msg = `ImportBatch ${unit.import_batch_id} not found.`;
      console.warn(`[ENGINE][WARN] ${msg}`);
      warnings.push(msg);
    }
  }

  // COMPONENTE 3: Expenses relacionados
  const expenseQueries = [{ linked_entity_type: 'InventoryUnits', linked_entity_id: inventoryUnitId }];
  if (unit.import_batch_id) {
    expenseQueries.push({ linked_entity_type: 'ImportBatches', linked_entity_id: unit.import_batch_id });
  }

  const expenseMap = new Map();
  for (const query of expenseQueries) {
    const fetched = await db.entities.Expenses.filter(query);
    for (const exp of (fetched || [])) {
      if (exp?.id) expenseMap.set(exp.id, exp);
    }
  }

  for (const expense of expenseMap.values()) {
    const expenseAmount = Number(expense.amount || 0);
    if (expenseAmount <= 0) continue;

    const componentKey = expense.allocation_category ? `expense_${expense.allocation_category}` : 'expense_other';

    if (expense.linked_entity_type === 'InventoryUnits' && expense.linked_entity_id === inventoryUnitId) {
      componentsToCreate.push({
        organization_id: organizationId,
        inventory_unit_id: inventoryUnitId,
        cost_component_key: componentKey,
        amount: round2(expenseAmount),
        metadata: { source_type: 'Expense', source_id: expense.id, notes: `Direct expense. Category: ${expense.allocation_category || 'unspecified'}` }
      });
      continue;
    }

    if (expense.linked_entity_type === 'ImportBatches' && unit.import_batch_id === expense.linked_entity_id) {
      const batchUnits = await db.entities.InventoryUnits.filter({ import_batch_id: expense.linked_entity_id });
      const totalBatchPurchaseCost = sumCostPurchaseUnits(batchUnits);
      if (totalBatchPurchaseCost > 0) {
        const proportionFactor = costPurchaseUnit / totalBatchPurchaseCost;
        const allocatedAmount = round2(expenseAmount * proportionFactor);
        if (allocatedAmount > 0) {
          componentsToCreate.push({
            organization_id: organizationId,
            inventory_unit_id: inventoryUnitId,
            cost_component_key: componentKey,
            amount: allocatedAmount,
            metadata: {
              source_type: 'Expense',
              source_id: expense.id,
              notes: `Proportional expense from ImportBatch. Category: ${expense.allocation_category || 'unspecified'}`,
              proportion_factor: round2(proportionFactor),
              batch_total_purchase_cost: round2(totalBatchPurchaseCost)
            }
          });
        }
      }
    }
  }

  // Persistir componentes válidos
  const validComponents = componentsToCreate.filter(c => c.amount > 0 && isValidOrgId(c.organization_id) && c.inventory_unit_id);
  const createdComponents = [];

  for (const comp of validComponents) {
    try {
      await db.entities.InventoryUnitCostComponents.create(comp);
      createdComponents.push(comp);
    } catch (createError) {
      const warnMsg = `component_creation_failed: key=${comp.cost_component_key}, error=${createError?.message || 'unknown'}`;
      console.warn(`[ENGINE][WARN] ${warnMsg}`);
      warnings.push(warnMsg);
    }
  }

  if (createdComponents.length === 0) {
    return { success: false, error: 'NO_VALID_COMPONENTS', message: 'No valid cost components generated', warnings };
  }

  const totalRealUnitCost = round2(createdComponents.reduce((acc, c) => acc + c.amount, 0));

  await db.entities.InventoryUnits.update(inventoryUnitId, { total_real_unit_cost: totalRealUnitCost });

  console.log(`[ENGINE] unit ${inventoryUnitId} | total_real_unit_cost: ${totalRealUnitCost} | components: ${createdComponents.length}`);

  return {
    success: true,
    inventory_unit_id: inventoryUnitId,
    organization_id: organizationId,
    components_created: createdComponents.length,
    components_summary: createdComponents.map(c => ({ key: c.cost_component_key, amount: c.amount, source_type: c.metadata?.source_type })),
    total_real_unit_cost: totalRealUnitCost,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

// ── Handler principal ──

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    // Validar acceso: admin o scheduler (sin usuario)
    let isAdminCall = false;
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
      }
      isAdminCall = !!user;
    } catch {
      // Scheduler/automation — sin usuario, continuar con serviceRole
    }

    const nowIso = new Date().toISOString();
    console.log(`[WORKER] Started at ${nowIso}. isAdminCall: ${isAdminCall}`);

    // PASO 1: Buscar registros pending con scheduled_for vencido
    const allPending = await db.entities.RecalculationQueue.filter({ status: 'pending' }, 'scheduled_for', 50);

    const duePending = (allPending || []).filter(r => r.scheduled_for && r.scheduled_for <= nowIso).slice(0, MAX_BATCH_SIZE);

    console.log(`[WORKER] Found ${allPending?.length || 0} total pending. ${duePending.length} are due.`);

    if (duePending.length === 0) {
      return Response.json({ success: true, processed: 0, message: 'No pending records due for processing.' });
    }

    // PASO 2: Procesar cada registro
    const results = [];

    for (const record of duePending) {
      const recordId = record.id;
      const unitId = record.inventory_unit_id;
      const orgId = record.organization_id;

      console.log(`[WORKER] Processing record ${recordId} | unit: ${unitId} | org: ${orgId}`);

      // 2a) Marcar como processing (lock lógico)
      try {
        await db.entities.RecalculationQueue.update(recordId, { status: 'processing' });
      } catch (lockError) {
        console.warn(`[WORKER] Could not lock record ${recordId}:`, lockError?.message);
        results.push({ record_id: recordId, unit_id: unitId, result: 'lock_failed', error: lockError?.message });
        continue;
      }

      // 2b) Ejecutar motor de costos (inlinado)
      let calcResult = null;
      let calcError = null;

      try {
        calcResult = await runCostEngine(db, unitId, orgId);
      } catch (engineError) {
        calcError = engineError?.message || 'Unknown engine error';
        console.error(`[WORKER] runCostEngine failed for unit ${unitId}:`, calcError);
      }

      const processedAt = new Date().toISOString();

      // 2c) Actualizar registro según resultado
      if (calcError) {
        await db.entities.RecalculationQueue.update(recordId, { status: 'failed', processed_at: processedAt, error_message: calcError });
        results.push({ record_id: recordId, unit_id: unitId, result: 'failed', error: calcError });
        console.log(`[WORKER] Record ${recordId} marked as failed (engine exception).`);
        continue;
      }

      if (!calcResult?.success && calcResult?.status !== 'skipped_sold') {
        const errMsg = calcResult?.error || calcResult?.message || 'Calculation returned success:false';
        await db.entities.RecalculationQueue.update(recordId, {
          status: 'failed',
          processed_at: processedAt,
          error_message: errMsg,
          metadata: { ...(record.metadata || {}), calc_response: calcResult }
        });
        results.push({ record_id: recordId, unit_id: unitId, result: 'failed', error: errMsg });
        console.log(`[WORKER] Record ${recordId} marked as failed (controlled error): ${errMsg}`);
        continue;
      }

      // Éxito (incluye skipped_sold)
      await db.entities.RecalculationQueue.update(recordId, {
        status: 'done',
        processed_at: processedAt,
        error_message: null,
        metadata: {
          ...(record.metadata || {}),
          total_real_unit_cost: calcResult?.total_real_unit_cost,
          components_created: calcResult?.components_created,
          warnings: calcResult?.warnings,
          skipped_sold: calcResult?.status === 'skipped_sold'
        }
      });

      results.push({
        record_id: recordId,
        unit_id: unitId,
        result: calcResult?.status === 'skipped_sold' ? 'done_skipped_sold' : 'done',
        total_real_unit_cost: calcResult?.total_real_unit_cost
      });

      console.log(`[WORKER] Record ${recordId} done. total_real_unit_cost: ${calcResult?.total_real_unit_cost}`);
    }

    // PASO 3: Respuesta del lote
    const doneCount = results.filter(r => r.result === 'done' || r.result === 'done_skipped_sold').length;
    const failedCount = results.filter(r => r.result === 'failed').length;

    console.log(`[WORKER] Batch complete. done: ${doneCount} | failed: ${failedCount} | total: ${results.length}`);

    return Response.json({ success: true, processed: results.length, done: doneCount, failed: failedCount, results });

  } catch (error) {
    console.error('[ERROR] processRecalculationQueue failed:', error);
    return Response.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
});