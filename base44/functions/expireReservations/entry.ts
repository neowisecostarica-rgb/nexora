/**
 * expireReservations
 *
 * CRON JOB: busca reservas activas cuyo expires_at < now y las expira,
 * liberando las unidades de inventario correspondientes.
 *
 * No requiere input — corre automáticamente por scheduler.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

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