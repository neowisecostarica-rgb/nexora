// ============================================================
// NEXORA — calculateRealUnitCost — Motor de Costos v2
// Bloque P0.2 — Componentes Dinámicos
// Bloque P0.2.1 — Hardening (validaciones reforzadas)
// Bloque P0.5 — Fix: asServiceRole para invocación desde worker
// ============================================================
//
// ARQUITECTURA:
//   - SOT final: InventoryUnits.total_real_unit_cost
//   - Descomposición: InventoryUnitCostComponents
//   - Distribución: Proporcional a cost_purchase_unit (regla oficial aprobada)
//   - Idempotencia: delete + recreate por unidad
//   - Auth: siempre usa asServiceRole (invocado por worker o directamente por admin)
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

function sumCostPurchaseUnits(units = []) {
  return units.reduce((acc, u) => acc + Number(u.cost_purchase_unit || 0), 0);
}

function isValidOrganizationId(orgId) {
  return typeof orgId === 'string' && orgId.trim().length > 0;
}

// ────────────────────────────────────────────────────────────
// HANDLER PRINCIPAL
// ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  let inventoryUnitId = null;

  try {
    const base44 = createClientFromRequest(req);
    // P0.5 FIX: usar asServiceRole para todas las operaciones de datos.
    // Este motor es invocado por el worker (sin token de usuario) o directamente
    // por admin. En ambos casos, las operaciones de entidad deben correr como servicio.
    const db = base44.asServiceRole;

    const body = await req.json();
    inventoryUnitId = body?.inventoryUnitId || null;

    console.log(`[START] calculateRealUnitCost invoked. inventoryUnitId: ${inventoryUnitId}`);

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
    const unit = await db.entities.InventoryUnits.get(inventoryUnitId);

    if (!unit) {
      return Response.json(
        { success: false, error: `InventoryUnit not found: ${inventoryUnitId}` },
        { status: 404 }
      );
    }

    const organizationId = unit.organization_id;
    console.log(`[VALIDATION] organization_id for unit ${inventoryUnitId}: "${organizationId}"`);

    // Hard fail si no tiene organization_id válido
    if (!isValidOrganizationId(organizationId)) {
      console.warn(`[ABORT] InventoryUnit ${inventoryUnitId} has invalid organization_id: ${organizationId}`);
      return Response.json(
        {
          success: false,
          inventory_unit_id: inventoryUnitId,
          error: 'INVALID_ORGANIZATION_ID',
          message: 'InventoryUnit must have a valid organization_id'
        },
        { status: 422 }
      );
    }

    // Unidades vendidas: costo histórico congelado — no recalcular
    if (unit.status === 'sold') {
      console.log(`[SKIP] InventoryUnit ${inventoryUnitId} is sold. Cost is frozen.`);
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
      console.warn(`[ABORT] InventoryUnit ${inventoryUnitId} has no valid cost_purchase_unit.`);
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

    console.log(`[VALIDATED] unit ${inventoryUnitId} | org: ${organizationId} | cost_purchase_unit: ${costPurchaseUnit}`);

    // ──────────────────────────────────────────────────────
    // PASO 4 — Borrar componentes previos (idempotencia)
    // Solo se ejecuta después de pasar todas las validaciones.
    // ──────────────────────────────────────────────────────
    const existingComponents = await db.entities.InventoryUnitCostComponents.filter({
      inventory_unit_id: inventoryUnitId
    });

    const existingCount = existingComponents?.length || 0;
    console.log(`[CLEAN] Deleting ${existingCount} existing cost components for unit ${inventoryUnitId}`);

    if (existingCount > 0) {
      for (const comp of existingComponents) {
        await db.entities.InventoryUnitCostComponents.delete(comp.id);
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
      const importBatch = await db.entities.ImportBatches.get(unit.import_batch_id);

      if (importBatch) {
        const batchUnits = await db.entities.InventoryUnits.filter({
          import_batch_id: unit.import_batch_id
        });

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
              metadata: {
                source_type: 'ImportBatch',
                source_id: unit.import_batch_id,
                notes: 'Fixed per-unit import cost (non-proportional)'
              }
            });
          }

        } else {
          const msg = `ImportBatch ${unit.import_batch_id} has no units with valid cost_purchase_unit. Import costs skipped.`;
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
    // Fuentes:
    //   A) Expenses directos a esta InventoryUnit
    //   B) Expenses vinculados a su ImportBatch (distribuidos proporcionalmente)
    //
    // PENDIENTE: Expenses vinculados a PurchaseItems — no implementado.

    const expenseQueries = [
      { linked_entity_type: 'InventoryUnits', linked_entity_id: inventoryUnitId }
    ];

    if (unit.import_batch_id) {
      expenseQueries.push({
        linked_entity_type: 'ImportBatches',
        linked_entity_id: unit.import_batch_id
      });
    }

    const expenseMap = new Map();
    for (const query of expenseQueries) {
      const fetched = await db.entities.Expenses.filter(query);
      for (const exp of (fetched || [])) {
        if (exp?.id) expenseMap.set(exp.id, exp);
      }
    }

    const uniqueExpenses = Array.from(expenseMap.values());
    console.log(`[EXPENSES] Found ${uniqueExpenses.length} unique related expenses.`);

    for (const expense of uniqueExpenses) {
      const expenseAmount = Number(expense.amount || 0);
      if (expenseAmount <= 0) continue;

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
        const batchUnits = await db.entities.InventoryUnits.filter({
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
          const msg = `Expense ${expense.id} linked to ImportBatch ${expense.linked_entity_id} could not be distributed.`;
          console.warn(`[WARN] ${msg}`);
          warnings.push(msg);
        }
      }
    }

    // ──────────────────────────────────────────────────────
    // PASO 5b — Persistir componentes válidos
    // ──────────────────────────────────────────────────────
    const validComponents = componentsToCreate.filter(c =>
      c.amount > 0 &&
      isValidOrganizationId(c.organization_id) &&
      c.inventory_unit_id
    );

    console.log(`[CREATE] Attempting to create ${validComponents.length} cost components for unit ${inventoryUnitId}`);

    const createdComponents = [];

    for (const comp of validComponents) {
      try {
        await db.entities.InventoryUnitCostComponents.create(comp);
        createdComponents.push(comp);
      } catch (createError) {
        const warnMsg = `component_creation_failed: key=${comp.cost_component_key}, amount=${comp.amount}, error=${createError?.message || 'unknown'}`;
        console.warn(`[WARN] ${warnMsg}`);
        warnings.push(warnMsg);
      }
    }

    console.log(`[CREATED] ${createdComponents.length} of ${validComponents.length} components created for unit ${inventoryUnitId}`);

    // Protección: no actualizar si no se creó ningún componente válido
    if (createdComponents.length === 0) {
      console.warn(`[ABORT] No valid cost components created for unit ${inventoryUnitId}.`);
      return Response.json(
        {
          success: false,
          inventory_unit_id: inventoryUnitId,
          error: 'NO_VALID_COMPONENTS',
          message: 'No valid cost components generated',
          warnings: warnings.length > 0 ? warnings : undefined
        },
        { status: 422 }
      );
    }

    // ──────────────────────────────────────────────────────
    // PASO 6 — Calcular y persistir total final
    // NOTA: SOLO escribe total_real_unit_cost. Los campos allocated_* son LEGACY.
    // ──────────────────────────────────────────────────────
    const totalRealUnitCost = round2(
      createdComponents.reduce((acc, c) => acc + c.amount, 0)
    );

    console.log(`[TOTAL] total_real_unit_cost for ${inventoryUnitId}: ${totalRealUnitCost}`);

    await db.entities.InventoryUnits.update(inventoryUnitId, {
      total_real_unit_cost: totalRealUnitCost
    });

    console.log(`[DONE] InventoryUnit ${inventoryUnitId} updated. total_real_unit_cost = ${totalRealUnitCost}`);

    return Response.json({
      success: true,
      inventory_unit_id: inventoryUnitId,
      organization_id: organizationId,
      components_created: createdComponents.length,
      components_summary: createdComponents.map(c => ({
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