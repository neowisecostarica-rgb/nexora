/**
 * cancelReservation
 *
 * Cancela una reserva activa y libera la unidad de inventario.
 *
 * INPUT: { reservation_id }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { reservation_id } = await req.json();

  if (!reservation_id) {
    return Response.json({ error: 'reservation_id requerido' }, { status: 400 });
  }

  const reservation = await base44.asServiceRole.entities.Reservations.get(reservation_id);
  if (!reservation) {
    return Response.json({ error: 'Reservación no encontrada' }, { status: 404 });
  }

  if (!['draft', 'reserved'].includes(reservation.status)) {
    return Response.json(
      {
        error: 'Solo se pueden cancelar reservas en estado draft o reserved',
        current_status: reservation.status
      },
      { status: 409 }
    );
  }

  // 1. Marcar reserva como cancelada
  await base44.asServiceRole.entities.Reservations.update(reservation_id, {
    status: 'cancelled'
  });

  // 2. Liberar unidad de inventario
  await base44.asServiceRole.entities.InventoryUnits.update(reservation.inventory_unit_id, {
    status: 'available'
  });

  return Response.json({
    success: true,
    reservation_id,
    inventory_unit_id: reservation.inventory_unit_id,
    status: 'cancelled'
  });
});