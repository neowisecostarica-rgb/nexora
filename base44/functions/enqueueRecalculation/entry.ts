// ============================================================
// NEXORA — enqueueRecalculation
// Bloque P0.4 — Orquestación Cost Engine
// ============================================================
//
// RESPONSABILIDAD:
//   Encolar una solicitud de recálculo de costo para una InventoryUnit.
//   NO llama calculateRealUnitCost directamente.
//   Aplica deduplicación y debounce via scheduled_for.
//
// DEBOUNCE:
//   scheduled_for = now + DEBOUNCE_SECONDS
//   Si ya existe un pending/processing para la misma unidad:
//     - NO crea duplicado
//     - Actualiza scheduled_for para extender la ventana
//
// MULTI-TENANT:
//   organization_id se toma de la InventoryUnit, no del caller.
//
// PENDIENTE — NO IMPLEMENTADO:
//   Expenses vinculados a PurchaseItems no pueden ser encolados
//   sin asumir relaciones inexistentes en el esquema actual.
//   → Documentado para el siguiente bloque.
// ============================================================

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DEBOUNCE_SECONDS = 15;

function nowPlusSeconds(seconds) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

Deno.serve(async (req) => {
  let inventoryUnitId = null;

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    inventoryUnitId = body?.inventory_unit_id || null;
    const triggerSource = body?.trigger_source || 'unknown';
    const triggerEntityType = body?.trigger_entity_type || null;
    const triggerEntityId = body?.trigger_entity_id || null;

    console.log(`[ENQUEUE] Received enqueue request. unit: ${inventoryUnitId} | source: ${triggerSource}`);

    // ──────────────────────────────────────────────────────
    // PASO 1 — Validar inventory_unit_id
    // ──────────────────────────────────────────────────────
    if (!inventoryUnitId) {
      return Response.json(
        { success: false, error: 'inventory_unit_id is required' },
        { status: 400 }
      );
    }

    // ──────────────────────────────────────────────────────
    // PASO 2 — Cargar InventoryUnit y validar organization_id
    // ──────────────────────────────────────────────────────
    const unit = await base44.entities.InventoryUnits.get(inventoryUnitId);

    if (!unit) {
      return Response.json(
        { success: false, error: `InventoryUnit not found: ${inventoryUnitId}` },
        { status: 404 }
      );
    }

    const organizationId = unit.organization_id;

    if (typeof organizationId !== 'string' || organizationId.trim().length === 0) {
      console.warn(`[ENQUEUE] InventoryUnit ${inventoryUnitId} has invalid organization_id. Aborting enqueue.`);
      return Response.json(
        {
          success: false,
          error: 'INVALID_ORGANIZATION_ID',
          message: 'InventoryUnit must have a valid organization_id to be enqueued'
        },
        { status: 422 }
      );
    }

    // No encolar unidades vendidas (el costo está congelado)
    if (unit.status === 'sold') {
      console.log(`[ENQUEUE] Skipping sold unit ${inventoryUnitId}. Cost is frozen.`);
      return Response.json({
        success: true,
        inventory_unit_id: inventoryUnitId,
        result: 'skipped_sold',
        message: 'Unit is sold. Cost is frozen. Enqueue skipped.'
      });
    }

    // ──────────────────────────────────────────────────────
    // PASO 3 — Construir dedupe_key
    // ──────────────────────────────────────────────────────
    const dedupeKey = `inventory_unit:${inventoryUnitId}`;
    const scheduledFor = nowPlusSeconds(DEBOUNCE_SECONDS);

    console.log(`[ENQUEUE] dedupe_key: ${dedupeKey} | scheduled_for: ${scheduledFor}`);

    // ──────────────────────────────────────────────────────
    // PASO 4 — Buscar si existe registro activo (pending o processing)
    // ──────────────────────────────────────────────────────
    const existingPending = await base44.asServiceRole.entities.RecalculationQueue.filter({
      dedupe_key: dedupeKey,
      status: 'pending'
    });

    const existingProcessing = await base44.asServiceRole.entities.RecalculationQueue.filter({
      dedupe_key: dedupeKey,
      status: 'processing'
    });

    const activePending = existingPending?.[0] || null;
    const activeProcessing = existingProcessing?.[0] || null;

    // ──────────────────────────────────────────────────────
    // PASO 5 — Deduplicar o crear nuevo registro
    // ──────────────────────────────────────────────────────
    if (activeProcessing) {
      // Ya está siendo procesado: no tocar, solo informar
      console.log(`[ENQUEUE] Unit ${inventoryUnitId} is currently processing. No action taken.`);
      return Response.json({
        success: true,
        inventory_unit_id: inventoryUnitId,
        result: 'already_processing',
        queue_record_id: activeProcessing.id,
        message: 'Unit is currently being processed. Request acknowledged but not re-enqueued.'
      });
    }

    if (activePending) {
      // Existe un pending: actualizar scheduled_for (extender debounce)
      console.log(`[ENQUEUE] Existing pending found (id: ${activePending.id}). Updating scheduled_for to extend debounce.`);
      await base44.asServiceRole.entities.RecalculationQueue.update(activePending.id, {
        scheduled_for: scheduledFor,
        trigger_source: triggerSource,
        trigger_entity_type: triggerEntityType,
        trigger_entity_id: triggerEntityId,
        metadata: {
          ...(activePending.metadata || {}),
          last_dedupe_at: new Date().toISOString(),
          dedupe_count: ((activePending.metadata?.dedupe_count || 0) + 1)
        }
      });

      return Response.json({
        success: true,
        inventory_unit_id: inventoryUnitId,
        result: 'deduplicated',
        queue_record_id: activePending.id,
        scheduled_for: scheduledFor,
        message: 'Existing pending record updated with new scheduled_for. No duplicate created.'
      });
    }

    // No existe activo: crear nuevo registro pending
    const newRecord = await base44.asServiceRole.entities.RecalculationQueue.create({
      organization_id: organizationId,
      inventory_unit_id: inventoryUnitId,
      trigger_source: triggerSource,
      trigger_entity_type: triggerEntityType || null,
      trigger_entity_id: triggerEntityId || null,
      status: 'pending',
      dedupe_key: dedupeKey,
      scheduled_for: scheduledFor,
      metadata: {
        enqueued_at: new Date().toISOString()
      }
    });

    console.log(`[ENQUEUE] New queue record created: ${newRecord.id} for unit ${inventoryUnitId}`);

    return Response.json({
      success: true,
      inventory_unit_id: inventoryUnitId,
      result: 'enqueued',
      queue_record_id: newRecord.id,
      scheduled_for: scheduledFor,
      organization_id: organizationId
    });

  } catch (error) {
    console.error(`[ERROR] enqueueRecalculation failed for unit ${inventoryUnitId}:`, error);
    return Response.json(
      { success: false, error: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
});