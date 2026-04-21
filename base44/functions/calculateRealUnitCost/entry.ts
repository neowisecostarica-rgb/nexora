// ============================================================
// NEXORA — calculateRealUnitCost — Motor de Costos v2
// Bloque P0.2 — Componentes Dinámicos
// ============================================================
//
// ARQUITECTURA:
//   - SOT final: InventoryUnits.total_real_unit_cost
//   - Descomposición: InventoryUnitCostComponents
//   - Distribución: Proporcional a cost_purchase_unit (regla oficial aprobada)
//   - Idempotencia: delete + recreate por unidad
//
// CAMPOS LEGACY — IGNORADOS INTENCIONALMENTE:
//   - allocated_import_cost     ← LEGACY, NO USADO
//   - allocated_tax_cost        ← LEGACY, NO USADO
//   - allocated_local_cost      ← LEGACY, NO USADO
//   - allocated_repair_cost     ← LEGACY, NO USADO
//   - allocated_other_cost      ← LEGACY, NO USADO
//   - legacy_real_unit_cost     ← LEGACY, NO USADO
//
// FUENTE DE COSTO BASE OFICIAL:
//   - InventoryUnits.cost_purchase_unit ← ÚNICA FUENTE BASE
//
// ============================================================

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ────────────────────────────────────────────────────────────
// UTILIDADES
// ────────────────────────────────────────────────────────────

function round2(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return 0;
  return parseFloat(num.toFixed(2));
}

// Suma el cost_purchase_unit de un array de InventoryUnits
// Usa el campo persistido directamente (ya es confiable en el nuevo modelo)
function sumCostPurchaseUnits(units = []) {
  return units.reduce((acc, u) => acc + Number(u.cost_purchase_unit || 0), 0);
}

// ────────────────────────────────────────────────────────────
// HANDLER PRINCIPAL
// ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  let inventoryUnitId = null;

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    inventoryUnitId = body?.inventoryUnitId || null;

    // ──────────────────────────────────────────────────────
    // PASO 1 — Validar input
    // ──────────────────────────────────────────────────────
    if (!inventoryUnitId) {
      return Response.json(
        { success: false, error: 'inventoryUnitId is required' },
        { status: 400 }
      );
    }

    // ──────────────────────────────────────────────────────
    // PASO 2 — Cargar InventoryUnit
    // ──────────────────────────────────────────────────────
    const unit = await base44.entities.InventoryUnits.get(inventoryUnitId);

    if (!unit) {
      return Response.json(
        { success: false, error: `InventoryUnit not found: ${inventoryUnitId}` },
        { status: 404 }
      );
    }

    const organizationId = unit.organization_id || null;

    // Unidades vendidas: proteger costo histórico congelado
    if (unit.status === 'sold') {
      console.log(`[SKIP] InventoryUnit ${inventoryUnitId} is sold. Cost is frozen. No recalculation.`);
      return Response.json({
        success: true,
        inventory_unit_id: inventoryUnitId,
        status: 'skipped_sold',
        total_real_unit_cost: round2(unit.total_real_unit_cost || 0),
        components_created: 0,
        warnings: ['Unit is sold. Cost is historically frozen and was not modified.']
      });
    }

    // ──────────────────────────────────────────────────────
    // PASO 3 — Validar costo base obligatorio
    // ──────────────────────────────────────────────────────
    const costPurchaseUnit = Number(unit.cost_purchase_unit || 0);

    if (!costPurchaseUnit || costPurchaseUnit <= 0) {
      console.warn(`[ERROR] InventoryUnit ${inventoryUnitId} has no valid cost_purchase_unit. Aborting.`);
      return Response.json(
        {
          success: false,
          inventory_unit_id: inventoryUnitId,
          error: 'cost_purchase_unit is missing or zero. Cannot calculate real unit cost.',
          hint: 'Set a valid cost_purchase_unit on the InventoryUnit before recalculating.'
        },
        { status: 422 }
      );
    }

    console.log(`[START] Calculating cost for InventoryUnit: ${inventoryUnitId} | org: ${organizationId} | cost_purchase_unit: ${costPurchaseUnit}`);

    // ──────────────────────────────────────────────────────
    // PASO 4 — Borrar componentes previos (idempotencia)
    // ──────────────────────────────────────────────────────
    const existingComponents = await base44.entities.InventoryUnitCostComponents.filter({
      inventory_unit_id: inventoryUnitId
    });

    if (existingComponents && existingComponents.length > 0) {
      console.log(`[CLEAN] Deleting ${existingComponents.length} existing cost components for unit ${inventoryUnitId}`);
      for (const comp of existingComponents) {
        await base44.entities.InventoryUnitCostComponents.delete(comp.id);
      }
    }

    // ──────────────────────────────────────────────────────
    // PASO 5 — Reconstruir componentes
    // ──────────────────────────────────────────────────────
    const componentsToCreate = [];
    const warnings = [];

    // ── COMPONENTE 1: COSTO BASE DE COMPRA (SIEMPRE PRESENTE) ──
    componentsToCreate.push({
      organization_id: organizationId,
      inventory_unit_id: inventoryUnitId,
      cost_component_key: 'purchase_base',
      amount: round2(costPurchaseUnit),
      metadata: {
        source_type: 'InventoryUnit',
        source_id: inventoryUnitId,
        notes: 'Base purchase cost from InventoryUnits.cost_purchase_unit'
      }
    });

    // ── COMPONENTE 2: COSTOS DE IMPORT BATCH (PROPORCIONAL) ──
    if (unit.import_batch_id) {
      const importBatch = await base44.entities.ImportBatches.get(unit.import_batch_id);

      if (importBatch) {
        // Obtener todas las unidades de este batch para calcular la base proporcional
        const batchUnits = await base44.entities.InventoryUnits.filter({
          import_batch_id: unit.import_batch_id
        });

        const totalBatchPurchaseCost = sumCostPurchaseUnits(batchUnits);

        if (totalBatchPurchaseCost > 0) {
          const proportionFactor = costPurchaseUnit / totalBatchPurchaseCost;

          // Cada campo de costo del batch genera su propio componente dinámico
          const batchCostFields = [
            { key: 'import_customs',         field: 'customs_total',         label: 'Customs duty from import batch' },
            { key: 'import_freight',          field: 'freight_total',         label: 'Freight cost from import batch' },
            { key: 'import_local_transport',  field: 'local_transport_total', label: 'Local transport from import batch' },
            { key: 'import_extra',            field: 'extra_cost_total',      label: 'Extra costs from import batch' },
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

          // Costo fijo por unidad (no proporcional) — si existe en el batch
          const perUnitDefault = Number(importBatch.per_unit_import_default || 0);
          if (perUnitDefault > 0) {
            componentsToCreate.push({
              organization_id: organizationId,
              inventory_unit_id: inventoryUnitId,
              cost_component_key: 'import_per_unit_fixed',
              amount: round2(perUnitDefault),
              metadata: {
                source_type: 'ImportBatch',
                source_id: unit.import_batch_id,
                notes: 'Fixed per-unit import cost (non-proportional)'
              }
            });
          }

        } else {
          const msg = `ImportBatch ${unit.import_batch_id} has no units with valid cost_purchase_unit for proportional distribution. Import costs skipped.`;
          console.warn(`[WARN] ${msg}`);
          warnings.push(msg);
        }

      } else {
        const msg = `ImportBatch ${unit.import_batch_id} not found. Import cost components skipped.`;
        console.warn(`[WARN] ${msg}`);
        warnings.push(msg);
      }
    }

    // ── COMPONENTE 3: EXPENSES RELACIONADOS ──
    //
    // Fuentes a consultar:
    //   A) Expenses directos a esta InventoryUnit
    //   B) Expenses vinculados a su ImportBatch (distribuidos proporcionalmente)
    //
    // RELACIÓN NO DISPONIBLE: PurchaseItem → Expenses
    //   El esquema actual de Expenses usa linked_entity_type/linked_entity_id.
    //   No hay un vínculo directo Expense → PurchaseItem que sea confiable
    //   en el contexto de distribución proporcional al cost_purchase_unit,
    //   ya que PurchaseItems no expone un aggregado de costo por unidad confiable
    //   para base proporcional sin recalcular dinámicamente cada ítem del lote.
    //   → Esta fuente queda documentada como PENDIENTE para el siguiente bloque.

    const expenseQueries = [
      { linked_entity_type: 'InventoryUnits', linked_entity_id: inventoryUnitId }
    ];

    if (unit.import_batch_id) {
      expenseQueries.push({
        linked_entity_type: 'ImportBatches',
        linked_entity_id: unit.import_batch_id
      });
    }

    // Recopilar y deduplicar expenses
    const expenseMap = new Map();
    for (const query of expenseQueries) {
      const fetched = await base44.entities.Expenses.filter(query);
      for (const exp of (fetched || [])) {
        if (exp?.id) expenseMap.set(exp.id, exp);
      }
    }

    const uniqueExpenses = Array.from(expenseMap.values());
    console.log(`[EXPENSES] Found ${uniqueExpenses.length} unique related expenses.`);

    for (const expense of uniqueExpenses) {
      const expenseAmount = Number(expense.amount || 0);
      if (expenseAmount <= 0) continue;

      // Mapeo dinámico de allocation_category a cost_component_key
      // NO hardcodeado — la clave refleja el allocation_category del gasto
      const componentKey = expense.allocation_category
        ? `expense_${expense.allocation_category}`
        : 'expense_other';

      // CASO A: Expense directo a esta InventoryUnit
      if (
        expense.linked_entity_type === 'InventoryUnits' &&
        expense.linked_entity_id === inventoryUnitId
      ) {
        componentsToCreate.push({
          organization_id: organizationId,
          inventory_unit_id: inventoryUnitId,
          cost_component_key: componentKey,
          amount: round2(expenseAmount),
          metadata: {
            source_type: 'Expense',
            source_id: expense.id,
            notes: `Direct expense. Category: ${expense.allocation_category || 'unspecified'}`
          }
        });
        continue;
      }

      // CASO B: Expense vinculado a ImportBatch — distribución proporcional
      if (
        expense.linked_entity_type === 'ImportBatches' &&
        unit.import_batch_id === expense.linked_entity_id
      ) {
        const batchUnits = await base44.entities.InventoryUnits.filter({
          import_batch_id: expense.linked_entity_id
        });

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
        } else {
          const msg = `Expense ${expense.id} linked to ImportBatch ${expense.linked_entity_id} could not be distributed: no valid cost_purchase_unit in batch units.`;
          console.warn(`[WARN] ${msg}`);
          warnings.push(msg);
        }
      }
    }

    // ──────────────────────────────────────────────────────
    // PASO 5b — Persistir componentes (solo amount > 0)
    // ──────────────────────────────────────────────────────
    const validComponents = componentsToCreate.filter(c => c.amount > 0);
    console.log(`[CREATE] Inserting ${validComponents.length} cost components for unit ${inventoryUnitId}`);

    for (const comp of validComponents) {
      await base44.entities.InventoryUnitCostComponents.create(comp);
    }

    // ──────────────────────────────────────────────────────
    // PASO 6 — Calcular total final
    // ──────────────────────────────────────────────────────
    const totalRealUnitCost = round2(
      validComponents.reduce((acc, c) => acc + c.amount, 0)
    );

    console.log(`[TOTAL] total_real_unit_cost for ${inventoryUnitId}: ${totalRealUnitCost}`);

    // ──────────────────────────────────────────────────────
    // PASO 7 — Actualizar InventoryUnit (SOLO total_real_unit_cost)
    //
    // NOTA: Los campos allocated_* NO se actualizan.
    //       Son campos legacy y serán eliminados en una fase futura.
    //       El único campo que escribe este motor es total_real_unit_cost.
    // ──────────────────────────────────────────────────────
    await base44.entities.InventoryUnits.update(inventoryUnitId, {
      total_real_unit_cost: totalRealUnitCost
    });

    console.log(`[DONE] InventoryUnit ${inventoryUnitId} updated. total_real_unit_cost = ${totalRealUnitCost}`);

    // ──────────────────────────────────────────────────────
    // PASO 8 — Responder resultado estructurado
    // ──────────────────────────────────────────────────────
    return Response.json({
      success: true,
      inventory_unit_id: inventoryUnitId,
      organization_id: organizationId,
      components_created: validComponents.length,
      components_summary: validComponents.map(c => ({
        key: c.cost_component_key,
        amount: c.amount,
        source_type: c.metadata?.source_type
      })),
      total_real_unit_cost: totalRealUnitCost,
      warnings: warnings.length > 0 ? warnings : undefined
    });

  } catch (error) {
    console.error(`[ERROR] calculateRealUnitCost failed for unit ${inventoryUnitId}:`, error);
    return Response.json(
      { success: false, error: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
});