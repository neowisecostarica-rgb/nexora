/**
 * createPayment
 *
 * Registra un pago real en el ledger financiero.
 *
 * REGLAS CRÍTICAS:
 * - NO modifica InventoryUnits.status
 * - NO modifica Reservations.status
 * - NO modifica Sales
 * - Requiere al menos reservation_id o sale_id
 * - Soporta múltiples pagos por venta (partial, full, deposit, refund, adjustment)
 *
 * INPUT: {
 *   amount, currency, payment_method, payment_type,
 *   reservation_id?, sale_id?, customer_name?, reference?, notes?
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VALID_METHODS = ['cash', 'transfer', 'card', 'sinpe', 'other'];
const VALID_TYPES   = ['deposit', 'partial', 'full', 'refund', 'adjustment'];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const {
    amount,
    currency,
    payment_method,
    payment_type,
    reservation_id,
    sale_id,
    customer_name,
    reference,
    notes
  } = await req.json();

  // --- VALIDACIONES DE CAMPOS REQUERIDOS ---
  if (amount === undefined || amount === null) {
    return Response.json({ error: 'amount es requerido' }, { status: 400 });
  }
  if (typeof amount !== 'number' || amount === 0) {
    return Response.json({ error: 'amount debe ser un número distinto de cero' }, { status: 400 });
  }
  if (!currency) {
    return Response.json({ error: 'currency es requerido' }, { status: 400 });
  }
  if (!payment_method || !VALID_METHODS.includes(payment_method)) {
    return Response.json(
      { error: `payment_method inválido. Opciones: ${VALID_METHODS.join(', ')}` },
      { status: 400 }
    );
  }
  if (!payment_type || !VALID_TYPES.includes(payment_type)) {
    return Response.json(
      { error: `payment_type inválido. Opciones: ${VALID_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  // --- VALIDACIÓN CRÍTICA: debe tener al menos un vínculo ---
  if (!reservation_id && !sale_id) {
    return Response.json(
      { error: 'Se requiere al menos reservation_id o sale_id para registrar un pago' },
      { status: 400 }
    );
  }

  // --- VALIDACIÓN REFERENCIAL: verificar que el vínculo exista ---
  if (reservation_id) {
    const reservation = await base44.asServiceRole.entities.Reservations.get(reservation_id);
    if (!reservation) {
      return Response.json({ error: 'Reservación no encontrada' }, { status: 404 });
    }
  }

  if (sale_id) {
    const sale = await base44.asServiceRole.entities.Sales.get(sale_id);
    if (!sale) {
      return Response.json({ error: 'Venta no encontrada' }, { status: 404 });
    }
  }

  // --- EFECTO ÚNICO: crear Payment en el ledger ---
  // NO se toca: InventoryUnits, Reservations, Sales
  const payment = await base44.asServiceRole.entities.Payments.create({
    amount,
    currency,
    payment_method,
    payment_type,
    status: 'pending',
    payment_date: new Date().toISOString(),
    reservation_id: reservation_id || null,
    sale_id: sale_id || null,
    customer_name: customer_name || null,
    reference: reference || null,
    notes: notes || null
  });

  return Response.json({
    success: true,
    payment_id: payment.id,
    amount,
    currency,
    payment_method,
    payment_type,
    status: 'pending',
    reservation_id: reservation_id || null,
    sale_id: sale_id || null
  });
});