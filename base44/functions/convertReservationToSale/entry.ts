/**
 * convertReservationToSale
 *
 * Convierte una reserva activa en una venta real con histórico congelado.
 *
 * REGLAS CRÍTICAS:
 * - Reservation.status MUST BE "reserved"
 * - InventoryUnit.status MUST BE "reserved"
 * - unit_cost_frozen ← InventoryUnits.total_real_unit_cost (SOT activo)
 *   Fallback temporal: legacy_real_unit_cost si total_real_unit_cost es 0/null
 *   → emite warning SOT_FALLBACK_USED para identificar registros pendientes de migración
 * - Una vez creado el SaleItem, NO se recalcula nada
 * - Una unidad solo puede venderse una vez (validación anti-duplicado)
 *
 * INPUT: { reservation_id, unit_price_sold, channel, customer_email?, notes? }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const {
    reservation_id,
    unit_price_sold,
    channel,
    customer_email,
    notes
  } = await req.json();

  if (!reservation_id || unit_price_sold === undefined || !channel) {
    return Response.json(
      { error: 'reservation_id, unit_price_sold y channel son requeridos' },
      { status: 400 }
    );
  }

  // --- VALIDACIÓN 1: Reservation debe existir y estar en estado "reserved" ---
  const reservation = await base44.asServiceRole.entities.Reservations.get(reservation_id);
  if (!reservation) {
    return Response.json({ error: 'Reservación no encontrada' }, { status: 404 });
  }
  if (reservation.status !== 'reserved') {
    return Response.json(
      {
        error: 'La reservación no está en estado reserved',
        current_status: reservation.status
      },
      { status: 409 }
    );
  }

  // --- VALIDACIÓN 2: InventoryUnit debe existir y estar en estado "reserved" ---
  const unit = await base44.asServiceRole.entities.InventoryUnits.get(reservation.inventory_unit_id);
  if (!unit) {
    return Response.json({ error: 'InventoryUnit no encontrada' }, { status: 404 });
  }
  if (unit.status !== 'reserved') {
    return Response.json(
      {
        error: 'La unidad de inventario no está en estado reserved',
        current_status: unit.status
      },
      { status: 409 }
    );
  }

  // --- VALIDACIÓN 3: Anti-duplicado — verificar que no exista SaleItem previo para esta unidad ---
  const existingSaleItems = await base44.asServiceRole.entities.SaleItems.filter({
    inventory_unit_id: reservation.inventory_unit_id
  });
  if (existingSaleItems && existingSaleItems.length > 0) {
    return Response.json(
      {
        error: 'Esta unidad ya fue vendida anteriormente',
        existing_sale_id: existingSaleItems[0].sale_id
      },
      { status: 409 }
    );
  }

  // --- CONGELAMIENTO DE COSTO: SOT es InventoryUnits.total_real_unit_cost ---
  // Fallback temporal: legacy_real_unit_cost si total_real_unit_cost es 0/null
  let unit_cost_frozen = unit.total_real_unit_cost || 0;
  if (unit_cost_frozen <= 0) {
    const fallbackCost = unit.legacy_real_unit_cost || 0;
    if (fallbackCost > 0) {
      unit_cost_frozen = fallbackCost;
      console.warn(`[SOT_FALLBACK_USED] inventory_unit_id: ${unit.id} | Context: convertReservationToSale freeze | Reason: total_real_unit_cost missing or zero | Fallback: legacy_real_unit_cost (${fallbackCost}) | Action: unit requires cost recalculation before sale`);
    }
  }
  const quantity = 1;
  const line_total = unit_price_sold * quantity;
  const profit_amount = line_total - (unit_cost_frozen * quantity);

  // --- EFECTO 1: Crear Sale ---
  const sale = await base44.asServiceRole.entities.Sales.create({
    customer_name: reservation.customer_name,
    customer_phone: reservation.customer_phone,
    customer_email: customer_email || reservation.customer_email || null,
    channel,
    subtotal: line_total,
    discount_total: 0,
    tax_total: 0,
    total: line_total,
    notes: notes || null
  });

  // --- EFECTO 2: Crear SaleItem con costo congelado ---
  await base44.asServiceRole.entities.SaleItems.create({
    sale_id: sale.id,
    inventory_unit_id: reservation.inventory_unit_id,
    quantity,
    unit_price_sold,
    unit_cost_frozen,   // ← real_unit_cost congelado, nunca cambia
    line_total,
    profit_amount
  });

  // --- EFECTO 3: Marcar unidad como vendida ---
  await base44.asServiceRole.entities.InventoryUnits.update(reservation.inventory_unit_id, {
    status: 'sold'
  });

  // --- EFECTO 4 + 5: Cerrar reserva y vincular sale_id ---
  await base44.asServiceRole.entities.Reservations.update(reservation_id, {
    status: 'converted_to_sale',
    sale_id: sale.id
  });

  return Response.json({
    success: true,
    sale_id: sale.id,
    reservation_id,
    inventory_unit_id: reservation.inventory_unit_id,
    unit_price_sold,
    unit_cost_frozen,
    profit_amount,
    line_total
  });
});