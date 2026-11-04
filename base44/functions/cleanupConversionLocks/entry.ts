/**
 * NEXORA — MAPA PARA DESARROLLADORES
 * Propósito: Limpia locks de conversión huérfanos (conversion_in_progress = true por más de 10 min). Invocado por automatización programada cada 15 minutos.
 * Datos/efectos detectados: PurchaseItems.filter, PurchaseItems.update
 * Dependencias: Revisar imports y consumidores; sin invoke literal detectado.
 * Límites: Preservar contratos; ver docs/NEXORA-REGRESSION-MATRIX.md. Runtime no certificado.
 * Referencia: docs/NEXORA-INVENTORY.md (base 54e8532).
 */
/**
 * cleanupConversionLocks
 *
 * Limpia locks de conversión huérfanos (conversion_in_progress = true por más de 10 min).
 * Invocado por automatización programada cada 15 minutos.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import {clientForRequest} from './tenant-access.mjs';

Deno.serve(async (req) => {
  // MG01: authenticate and scope every SDK entity operation before legacy logic runs.
    const rawClient = createClientFromRequest(req);
    let base44;
    try { base44 = await clientForRequest(rawClient, req); }
    catch (error) {
      return Response.json({error: error.code || 'TENANT_ACCESS_DENIED'}, {status: error.status || 403});
    }

  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const lockedItems = await base44.asServiceRole.entities.PurchaseItems.filter({
    conversion_in_progress: true
  });

  const TEN_MINUTES_MS = 10 * 60 * 1000;
  const now = new Date();
  let cleaned = 0;

  for (const item of lockedItems) {
    const updatedAt = new Date(item.updated_date || item.created_date);
    const ageMs = now - updatedAt;

    if (ageMs > TEN_MINUTES_MS) {
      await base44.asServiceRole.entities.PurchaseItems.update(item.id, {
        conversion_in_progress: false
      });
      cleaned++;
    }
  }

  return Response.json({
    success: true,
    locks_cleaned: cleaned,
    total_checked: lockedItems.length
  });
});