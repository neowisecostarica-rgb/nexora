/**
 * createReservation
 *
 * Crea una reserva y bloquea el inventario.
 * REGLA CRÍTICA: solo permite reservar si InventoryUnits.status === "available"
 *
 * INPUT: { inventory_unit_id, customer_name, customer_phone, customer_email?, required_deposit?, expires_at? }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const {
    inventory_unit_id,
    customer_name,
    customer_phone,
    customer_email,
    required_deposit,
    expires_at
  } = await req.json();

  if (!inventory_unit_id || !customer_name || !customer_phone) {
    return Response.json(
      { error: 'inventory_unit_id, customer_name y customer_phone son requeridos' },
      { status: 400 }
    );
  }

  // VALIDACIÓN CRÍTICA: la unidad debe estar disponible
  const unit = await base44.asServiceRole.entities.InventoryUnits.get(inventory_unit_id);
  if (!unit) {
    return Response.json({ error: 'InventoryUnit no encontrada' }, { status: 404 });
  }

  if (unit.status !== 'available') {
    return Response.json(
      {
        error: 'La unidad no está disponible para reservar',
        current_status: unit.status
      },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();

  // 1. Crear Reservation con status = reserved
  const reservation = await base44.asServiceRole.entities.Reservations.create({
    inventory_unit_id,
    customer_name,
    customer_phone,
    customer_email: customer_email || null,
    required_deposit: required_deposit || null,
    expires_at: expires_at || null,
    status: 'reserved',
    reserved_at: now,
    notes: null,
    sale_id: null
  });

  // 2. Bloquear unidad de inventario
  await base44.asServiceRole.entities.InventoryUnits.update(inventory_unit_id, {
    status: 'reserved'
  });

  return Response.json({
    success: true,
    reservation_id: reservation.id,
    inventory_unit_id,
    status: 'reserved',
    reserved_at: now
  });
});