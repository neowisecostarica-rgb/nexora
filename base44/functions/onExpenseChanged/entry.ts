// ============================================================
// NEXORA — onExpenseChanged
// Bloque P0.4 — Automation handler: Expenses create/update
// ============================================================
//
// RESPONSABILIDAD:
//   Recibir evento de creación/actualización de Expense,
//   detectar la(s) InventoryUnit(s) afectadas según
//   linked_entity_type, y encolar recálculos.
//
// CASOS IMPLEMENTADOS:
//   A) linked_entity_type = InventoryUnits  → encolar esa unidad directamente
//   B) linked_entity_type = ImportBatches   → encolar todas las unidades del batch
//
// CASO NO IMPLEMENTADO (documentado):
//   C) linked_entity_type = PurchaseItems
//      No existe relación confiable PurchaseItem → InventoryUnits
//      que permita distribución proporcional sin asumir campos
//      no disponibles en el esquema actual.
//      → PENDIENTE para el siguiente bloque.
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
    const expenseId = body?.event?.entity_id || body?.data?.id || null;
    const expenseData = body?.data || null;

    console.log(`[ON_EXPENSE_CHANGED] event: ${eventType} | expense_id: ${expenseId}`);

    if (!expenseId) {
      console.warn('[ON_EXPENSE_CHANGED] No entity_id in payload. Skipping.');
      return Response.json({ success: true, result: 'skipped_no_entity_id' });
    }

    // Leer expense actualizado si el payload no lo incluye completo
    let expense = expenseData;
    if (!expense || !expense.linked_entity_type) {
      expense = await base44.asServiceRole.entities.Expenses.get(expenseId);
    }

    if (!expense) {
      console.warn(`[ON_EXPENSE_CHANGED] Expense ${expenseId} not found. Skipping.`);
      return Response.json({ success: true, result: 'expense_not_found' });
    }

    const linkedType = expense.linked_entity_type || null;
    const linkedId = expense.linked_entity_id || null;

    console.log(`[ON_EXPENSE_CHANGED] linked_entity_type: ${linkedType} | linked_entity_id: ${linkedId}`);

    // ──────────────────────────────────────────────────────
    // CASO A: Expense directo a InventoryUnit
    // ──────────────────────────────────────────────────────
    if (linkedType === 'InventoryUnits' && linkedId) {
      try {
        await base44.asServiceRole.functions.invoke('enqueueRecalculation', {
          inventory_unit_id: linkedId,
          trigger_source: 'onExpenseChanged',
          trigger_entity_type: 'Expenses',
          trigger_entity_id: expenseId
        });
        console.log(`[ON_EXPENSE_CHANGED] Enqueued unit ${linkedId} (direct expense).`);
      } catch (err) {
        console.warn(`[ON_EXPENSE_CHANGED] Failed to enqueue unit ${linkedId}:`, err?.message);
      }

      return Response.json({
        success: true,
        expense_id: expenseId,
        linked_entity_type: linkedType,
        result: 'enqueued_direct_unit'
      });
    }

    // ──────────────────────────────────────────────────────
    // CASO B: Expense vinculado a ImportBatch
    // ──────────────────────────────────────────────────────
    if (linkedType === 'ImportBatches' && linkedId) {
      const batchUnits = await base44.asServiceRole.entities.InventoryUnits.filter({
        import_batch_id: linkedId
      });

      if (!batchUnits || batchUnits.length === 0) {
        console.log(`[ON_EXPENSE_CHANGED] No units found for batch ${linkedId}.`);
        return Response.json({
          success: true,
          expense_id: expenseId,
          result: 'no_units_found_for_batch',
          batch_id: linkedId
        });
      }

      const enqueueResults = [];

      for (const unit of batchUnits) {
        if (!unit?.id) continue;
        if (unit.status === 'sold') {
          enqueueResults.push({ unit_id: unit.id, result: 'skipped_sold' });
          continue;
        }

        try {
          await base44.asServiceRole.functions.invoke('enqueueRecalculation', {
            inventory_unit_id: unit.id,
            trigger_source: 'onExpenseChanged',
            trigger_entity_type: 'Expenses',
            trigger_entity_id: expenseId
          });
          enqueueResults.push({ unit_id: unit.id, result: 'enqueued' });
          console.log(`[ON_EXPENSE_CHANGED] Enqueued unit ${unit.id} (via batch ${linkedId}).`);
        } catch (err) {
          console.warn(`[ON_EXPENSE_CHANGED] Failed to enqueue unit ${unit.id}:`, err?.message);
          enqueueResults.push({ unit_id: unit.id, result: 'enqueue_failed', error: err?.message });
        }
      }

      return Response.json({
        success: true,
        expense_id: expenseId,
        linked_entity_type: linkedType,
        batch_id: linkedId,
        units_found: batchUnits.length,
        enqueue_results: enqueueResults
      });
    }

    // ──────────────────────────────────────────────────────
    // CASO C: PurchaseItems — NO IMPLEMENTADO
    // ──────────────────────────────────────────────────────
    if (linkedType === 'PurchaseItems') {
      console.log(`[ON_EXPENSE_CHANGED] linked_entity_type=PurchaseItems is not yet supported. Skipping. expense_id: ${expenseId}`);
      return Response.json({
        success: true,
        expense_id: expenseId,
        result: 'skipped_purchase_items_not_implemented',
        message: 'Expenses linked to PurchaseItems are not yet supported. No reliable mapping from PurchaseItem to InventoryUnit cost_purchase_unit base exists without assumptions. Pending next block.'
      });
    }

    // Expense sin linked_entity_type reconocido
    console.log(`[ON_EXPENSE_CHANGED] Unknown or null linked_entity_type: ${linkedType}. No action taken.`);
    return Response.json({
      success: true,
      expense_id: expenseId,
      result: 'skipped_unknown_linked_type',
      linked_entity_type: linkedType
    });

  } catch (error) {
    console.error('[ERROR] onExpenseChanged failed:', error);
    return Response.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
});