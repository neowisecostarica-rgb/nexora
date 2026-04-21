// ============================================================
// NEXORA — processRecalculationQueue
// Bloque P0.4 — Orquestación Cost Engine
// ============================================================
//
// RESPONSABILIDAD:
//   Worker central que procesa la RecalculationQueue.
//   Toma registros pending cuyo scheduled_for ya venció
//   y ejecuta calculateRealUnitCost para cada uno.
//
// EJECUCIÓN:
//   - Puede llamarse manualmente desde el dashboard
//   - Puede ejecutarse vía automation scheduled (cada 5 min mínimo en Base44)
//   - Seguro para ejecuciones concurrentes (status processing actúa como lock lógico)
//
// LOTE:
//   Máximo MAX_BATCH_SIZE registros por ejecución.
//   Un fallo individual NO detiene el lote completo.
//
// NO TOCA calculateRealUnitCost directamente como código:
//   Lo invoca via base44.functions.invoke — respeta la arquitectura.
// ============================================================

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MAX_BATCH_SIZE = 10;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Solo admin puede invocar el worker directamente
    // Para ejecución por scheduler (sin usuario), usar asServiceRole directamente
    // El worker acepta ambas formas de invocación
    let isAdminCall = false;
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json(
          { success: false, error: 'Forbidden: Admin access required' },
          { status: 403 }
        );
      }
      isAdminCall = !!user;
    } catch {
      // Invocación sin usuario (scheduler/automation) — continuar con serviceRole
    }

    const nowIso = new Date().toISOString();
    console.log(`[WORKER] processRecalculationQueue started at ${nowIso}. isAdminCall: ${isAdminCall}`);

    // ──────────────────────────────────────────────────────
    // PASO 1 — Buscar registros pending con scheduled_for vencido
    // ──────────────────────────────────────────────────────
    // Base44 filter no soporta operadores de comparación de fecha nativa,
    // por lo que traemos todos los pending y filtramos en memoria.
    // Limitamos la consulta a un tamaño razonable para evitar overhead.
    const allPending = await base44.asServiceRole.entities.RecalculationQueue.filter(
      { status: 'pending' },
      'scheduled_for',
      50  // Traer más de los necesarios para poder filtrar
    );

    const duePending = (allPending || []).filter(record => {
      return record.scheduled_for && record.scheduled_for <= nowIso;
    }).slice(0, MAX_BATCH_SIZE);

    console.log(`[WORKER] Found ${allPending?.length || 0} total pending. ${duePending.length} are due for processing.`);

    if (duePending.length === 0) {
      return Response.json({
        success: true,
        processed: 0,
        message: 'No pending records due for processing.'
      });
    }

    // ──────────────────────────────────────────────────────
    // PASO 2 — Procesar cada registro del lote
    // ──────────────────────────────────────────────────────
    const results = [];

    for (const record of duePending) {
      const recordId = record.id;
      const unitId = record.inventory_unit_id;

      console.log(`[WORKER] Processing record ${recordId} for unit ${unitId}`);

      // ── 2a) Marcar como processing (lock lógico) ──
      try {
        await base44.asServiceRole.entities.RecalculationQueue.update(recordId, {
          status: 'processing'
        });
      } catch (lockError) {
        console.warn(`[WORKER] Could not lock record ${recordId}:`, lockError?.message);
        results.push({ record_id: recordId, unit_id: unitId, result: 'lock_failed', error: lockError?.message });
        continue;
      }

      // ── 2b) Invocar calculateRealUnitCost ──
      let calcResult = null;
      let calcError = null;

      try {
        const calcResponse = await base44.asServiceRole.functions.invoke('calculateRealUnitCost', {
          inventoryUnitId: unitId
        });
        calcResult = calcResponse?.data || calcResponse;
      } catch (invokeError) {
        calcError = invokeError?.message || 'Unknown invoke error';
        console.error(`[WORKER] calculateRealUnitCost invoke failed for unit ${unitId}:`, calcError);
      }

      const processedAt = new Date().toISOString();

      // ── 2c) Actualizar registro según resultado ──
      if (calcError) {
        await base44.asServiceRole.entities.RecalculationQueue.update(recordId, {
          status: 'failed',
          processed_at: processedAt,
          error_message: calcError
        });
        results.push({ record_id: recordId, unit_id: unitId, result: 'failed', error: calcError });
        console.log(`[WORKER] Record ${recordId} marked as failed.`);
        continue;
      }

      // Caso especial: sold (skipped por el motor — se considera done)
      const isSkipped = calcResult?.status === 'skipped_sold' || !calcResult?.success;

      if (isSkipped && calcResult?.status !== 'skipped_sold') {
        // Fallo controlado devuelto por la función (success: false)
        const errMsg = calcResult?.error || calcResult?.message || 'Calculation returned success:false';
        await base44.asServiceRole.entities.RecalculationQueue.update(recordId, {
          status: 'failed',
          processed_at: processedAt,
          error_message: errMsg,
          metadata: {
            ...(record.metadata || {}),
            calc_response: calcResult
          }
        });
        results.push({ record_id: recordId, unit_id: unitId, result: 'failed', error: errMsg });
        console.log(`[WORKER] Record ${recordId} marked as failed (controlled error).`);
        continue;
      }

      // Éxito (incluye skipped_sold como done)
      await base44.asServiceRole.entities.RecalculationQueue.update(recordId, {
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

      console.log(`[WORKER] Record ${recordId} marked as done. total_real_unit_cost: ${calcResult?.total_real_unit_cost}`);
    }

    // ──────────────────────────────────────────────────────
    // PASO 3 — Respuesta del lote
    // ──────────────────────────────────────────────────────
    const doneCount = results.filter(r => r.result === 'done' || r.result === 'done_skipped_sold').length;
    const failedCount = results.filter(r => r.result === 'failed').length;

    console.log(`[WORKER] Batch complete. done: ${doneCount} | failed: ${failedCount} | total: ${results.length}`);

    return Response.json({
      success: true,
      processed: results.length,
      done: doneCount,
      failed: failedCount,
      results
    });

  } catch (error) {
    console.error('[ERROR] processRecalculationQueue failed:', error);
    return Response.json(
      { success: false, error: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
});