/**
 * NEXORA — MAPA PARA DESARROLLADORES
 * Propósito: CRON JOB: busca reservas activas cuyo expires_at < now y las expira, liberando las unidades de inventario correspondientes.
 * Datos/efectos detectados: InventoryUnits.update, Reservations.filter, Reservations.update
 * Dependencias: Revisar imports y consumidores; sin invoke literal detectado.
 * Límites: Preservar contratos; ver docs/NEXORA-REGRESSION-MATRIX.md. Runtime no certificado.
 * Referencia: docs/NEXORA-INVENTORY.md (base 54e8532).
 */
/**
 * expireReservations
 *
 * CRON JOB: busca reservas activas cuyo expires_at < now y las expira,
 * liberando las unidades de inventario correspondientes.
 *
 * No requiere input — corre automáticamente por scheduler.
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

  // Función invocada por scheduler — usar service role directamente
  const now = new Date().toISOString();

  // Buscar todas las reservas activas (reserved) con expires_at definido
  const activeReservations = await base44.asServiceRole.entities.Reservations.filter({
    status: 'reserved'
  });

  const expired = activeReservations.filter(
    (r) => r.expires_at && r.expires_at < now
  );

  if (expired.length === 0) {
    return Response.json({ success: true, expired_count: 0 });
  }

  const results = await Promise.all(
    expired.map(async (reservation) => {
      // 1. Marcar reserva como expirada
      await base44.asServiceRole.entities.Reservations.update(reservation.id, {
        status: 'expired'
      });

      // 2. Liberar unidad de inventario
      await base44.asServiceRole.entities.InventoryUnits.update(
        reservation.inventory_unit_id,
        { status: 'available' }
      );

      return { reservation_id: reservation.id, inventory_unit_id: reservation.inventory_unit_id };
    })
  );

  return Response.json({
    success: true,
    expired_count: results.length,
    expired_reservations: results
  });
});