// functions/calculateRealUnitCost.js
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function round2(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return 0;
  return parseFloat(num.toFixed(2));
}

async function getUnitPurchaseCost(base44, unit) {
  if (!unit?.purchase_item_id) return 0;

  const purchaseItem = await base44.entities.PurchaseItems.get(unit.purchase_item_id);
  if (!purchaseItem) return 0;

  const quantity = Number(purchaseItem.quantity || 0);
  if (quantity <= 0) return 0;

  return Number(purchaseItem.item_subtotal || 0) / quantity;
}

async function getPurchaseCostsSumForUnits(base44, units = []) {
  let total = 0;

  for (const unit of units) {
    total += await getUnitPurchaseCost(base44, unit);
  }

  return total;
}

Deno.serve(async (req) => {
  let inventoryUnitId = null;

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    inventoryUnitId = body?.inventoryUnitId || null;

    if (!inventoryUnitId) {
      return Response.json(
        { error: 'inventoryUnitId is required' },
        { status: 400 }
      );
    }

    const inventoryUnit = await base44.entities.InventoryUnits.get(inventoryUnitId);

    if (!inventoryUnit) {
      return Response.json(
        { error: 'InventoryUnit not found' },
        { status: 404 }
      );
    }

    // No recalcular si ya fue vendida
    if (inventoryUnit.status === 'sold') {
      console.log(`Skipping recalculation for sold InventoryUnit: ${inventoryUnitId}`);
      return Response.json(
        {
          inventoryUnitId,
          total_real_unit_cost: round2(inventoryUnit.total_real_unit_cost || inventoryUnit.legacy_real_unit_cost || 0),
          status: 'skipped'
        },
        { status: 200 }
      );
    }

    let cost_purchase_unit = 0;
    let allocated_import_cost = 0;
    let allocated_tax_cost = 0;
    let allocated_local_cost = 0;
    let allocated_repair_cost = 0;
    let allocated_other_cost = 0;

    let purchaseItem = null;
    let purchaseOrder = null;

    // ====================================================
    // 1) COSTO BASE
    // ====================================================
    if (inventoryUnit.purchase_item_id) {
      purchaseItem = await base44.entities.PurchaseItems.get(inventoryUnit.purchase_item_id);

      if (purchaseItem) {
        const quantity = Number(purchaseItem.quantity || 0);
        if (quantity > 0) {
          cost_purchase_unit = Number(purchaseItem.item_subtotal || 0) / quantity;
        } else {
          console.warn(`PurchaseItem ${purchaseItem.id} has quantity 0. cost_purchase_unit = 0`);
        }

        // ====================================================
        // 2) COSTOS DESDE PURCHASE ORDER
        // ====================================================
        if (purchaseItem.purchase_order_id) {
          purchaseOrder = await base44.entities.PurchaseOrders.get(purchaseItem.purchase_order_id);

          if (purchaseOrder) {
            const totalUnits = Number(purchaseOrder.total_units || 0);

            if (totalUnits > 0) {
              allocated_tax_cost = Number(purchaseOrder.usa_tax_total || 0) / totalUnits;
              allocated_other_cost = Number(purchaseOrder.usa_shipping_total || 0) / totalUnits;
            } else {
              console.warn(`PurchaseOrder ${purchaseOrder.id} has total_units 0.`);
            }
          } else {
            console.warn(`PurchaseOrder ${purchaseItem.purchase_order_id} not found.`);
          }
        }
      } else {
        console.warn(`PurchaseItem ${inventoryUnit.purchase_item_id} not found.`);
      }
    } else {
      console.warn(`InventoryUnit ${inventoryUnitId} has no purchase_item_id.`);
    }

    // ====================================================
    // 3) COSTOS DESDE IMPORT BATCH
    // ====================================================
    if (inventoryUnit.import_batch_id) {
      const importBatch = await base44.entities.ImportBatches.get(inventoryUnit.import_batch_id);

      if (importBatch) {
        const associatedInventoryUnits =
          await base44.entities.InventoryUnits.filter({ import_batch_id: importBatch.id });

        // Recalcular costo base de cada unidad asociada en tiempo real (NO usa campo persistido)
        const totalCostPurchaseOfBatchUnits =
          await getPurchaseCostsSumForUnits(base44, associatedInventoryUnits);

        const totalProportionalImportBatchCosts =
          Number(importBatch.customs_total || 0) +
          Number(importBatch.freight_total || 0) +
          Number(importBatch.local_transport_total || 0) +
          Number(importBatch.extra_cost_total || 0);

        if (totalCostPurchaseOfBatchUnits > 0) {
          allocated_import_cost +=
            (totalProportionalImportBatchCosts / totalCostPurchaseOfBatchUnits) * cost_purchase_unit;
        } else {
          console.warn(
            `ImportBatch ${importBatch.id} has no associated units with valid purchase cost for proportional distribution.`
          );
        }

        // Costo fijo directo por unidad (NO se distribuye)
        allocated_import_cost += Number(importBatch.per_unit_import_default || 0);
      } else {
        console.warn(`ImportBatch ${inventoryUnit.import_batch_id} not found.`);
      }
    }

    // ====================================================
    // 4) EXPENSES FILTRADOS Y DEDUPLICADOS
    // ====================================================
    const relatedExpenseQueries = [
      { linked_entity_type: 'InventoryUnits', linked_entity_id: inventoryUnitId }
    ];

    if (inventoryUnit.purchase_item_id) {
      relatedExpenseQueries.push({
        linked_entity_type: 'PurchaseItems',
        linked_entity_id: inventoryUnit.purchase_item_id
      });
    }

    if (inventoryUnit.import_batch_id) {
      relatedExpenseQueries.push({
        linked_entity_type: 'ImportBatches',
        linked_entity_id: inventoryUnit.import_batch_id
      });
    }

    let allRelatedExpenses = [];

    for (const query of relatedExpenseQueries) {
      const expenses = await base44.entities.Expenses.filter(query);
      allRelatedExpenses = allRelatedExpenses.concat(expenses || []);
    }

    // Deduplicación por ID
    const uniqueExpensesMap = new Map();
    for (const expense of allRelatedExpenses) {
      if (expense?.id) uniqueExpensesMap.set(expense.id, expense);
    }

    const uniqueExpenses = Array.from(uniqueExpensesMap.values());

    for (const expense of uniqueExpenses) {
      const allocationCategory = expense?.allocation_category || null;

      // Solo incluir repair / local
      if (allocationCategory !== 'repair' && allocationCategory !== 'local') {
        console.log(
          `Expense ${expense.id} excluded from cost allocation. allocation_category=${allocationCategory}`
        );
        continue;
      }

      // CASO 1: DIRECTO A INVENTORY UNIT
      if (
        expense.linked_entity_type === 'InventoryUnits' &&
        expense.linked_entity_id === inventoryUnitId
      ) {
        if (allocationCategory === 'repair') {
          allocated_repair_cost += Number(expense.amount || 0);
        } else if (allocationCategory === 'local') {
          allocated_local_cost += Number(expense.amount || 0);
        }
        continue;
      }

      // CASO 2: DISTRIBUCIÓN POR PURCHASE ITEM
      if (
        expense.linked_entity_type === 'PurchaseItems' &&
        inventoryUnit.purchase_item_id === expense.linked_entity_id
      ) {
        const purchaseItemUnits =
          await base44.entities.InventoryUnits.filter({ purchase_item_id: expense.linked_entity_id });

        // Recalcular en tiempo real (NO usa campo persistido)
        const totalCostPurchaseOfItemUnits =
          await getPurchaseCostsSumForUnits(base44, purchaseItemUnits);

        if (totalCostPurchaseOfItemUnits > 0) {
          const distributed =
            (Number(expense.amount || 0) / totalCostPurchaseOfItemUnits) * cost_purchase_unit;

          if (allocationCategory === 'repair') {
            allocated_repair_cost += distributed;
          } else if (allocationCategory === 'local') {
            allocated_local_cost += distributed;
          }
        } else {
          console.warn(
            `PurchaseItem ${expense.linked_entity_id} has no associated units with valid purchase cost for expense distribution.`
          );
        }

        continue;
      }

      // CASO 3: DISTRIBUCIÓN POR IMPORT BATCH
      if (
        expense.linked_entity_type === 'ImportBatches' &&
        inventoryUnit.import_batch_id === expense.linked_entity_id
      ) {
        const importBatchUnits =
          await base44.entities.InventoryUnits.filter({ import_batch_id: expense.linked_entity_id });

        // Recalcular en tiempo real (NO usa campo persistido)
        const totalCostPurchaseOfBatchUnits =
          await getPurchaseCostsSumForUnits(base44, importBatchUnits);

        if (totalCostPurchaseOfBatchUnits > 0) {
          const distributed =
            (Number(expense.amount || 0) / totalCostPurchaseOfBatchUnits) * cost_purchase_unit;

          if (allocationCategory === 'repair') {
            allocated_repair_cost += distributed;
          } else if (allocationCategory === 'local') {
            allocated_local_cost += distributed;
          }
        } else {
          console.warn(
            `ImportBatch ${expense.linked_entity_id} has no associated units with valid purchase cost for expense distribution.`
          );
        }
      }
    }

    // ====================================================
    // 5) TOTAL FINAL
    // ====================================================
    const total_real_unit_cost =
      Number(cost_purchase_unit || 0) +
      Number(allocated_import_cost || 0) +
      Number(allocated_tax_cost || 0) +
      Number(allocated_local_cost || 0) +
      Number(allocated_repair_cost || 0) +
      Number(allocated_other_cost || 0);

    const finalCosts = {
      cost_purchase_unit: round2(cost_purchase_unit),
      allocated_import_cost: round2(allocated_import_cost),
      allocated_tax_cost: round2(allocated_tax_cost),
      allocated_local_cost: round2(allocated_local_cost),
      allocated_repair_cost: round2(allocated_repair_cost),
      allocated_other_cost: round2(allocated_other_cost),
      total_real_unit_cost: round2(total_real_unit_cost)
    };

    await base44.entities.InventoryUnits.update(inventoryUnitId, {
      cost_purchase_unit: finalCosts.cost_purchase_unit,
      allocated_import_cost: finalCosts.allocated_import_cost,
      allocated_tax_cost: finalCosts.allocated_tax_cost,
      allocated_local_cost: finalCosts.allocated_local_cost,
      allocated_repair_cost: finalCosts.allocated_repair_cost,
      allocated_other_cost: finalCosts.allocated_other_cost,
      total_real_unit_cost: finalCosts.total_real_unit_cost,
      legacy_real_unit_cost: finalCosts.total_real_unit_cost
    });

    return Response.json(
      {
        inventoryUnitId,
        total_real_unit_cost: finalCosts.total_real_unit_cost,
        status: 'ok'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error recalculating real unit cost for InventoryUnit:', inventoryUnitId, error);
    return Response.json(
      { error: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
});