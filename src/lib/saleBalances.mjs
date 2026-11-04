/**
 * Ledger de solo lectura: no infiere tipos de cambio ni transforma pagos pendientes.
 * El saldo solo es mostrable cuando conocemos la moneda de la venta y el historial
 * de pagos es completo. No modifica registros ni concede acceso.
 */
export function saleBalance(sale, payments, { complete = true } = {}) {
  const related = (payments || []).filter(p => p.sale_id === sale?.id);
  const currency = typeof sale?.currency === "string" ? sale.currency.trim().toUpperCase() : "";
  const total = Number(sale?.total);
  const unknown = () => ({ paid: null, balance: null, currency, reconciled: false, related: related.length });
  if (!complete || !currency || !Number.isFinite(total) || total < 0) return unknown();
  let paid = 0;
  for (const p of related) {
    // Un pago pendiente, fallido o cancelado no reduce la cuenta por cobrar.
    if (["pending", "failed", "cancelled"].includes(p.status)) continue;
    // "refunded" y "adjustment" requieren semántica contable verificada.
    if (p.status !== "confirmed" || p.payment_type === "adjustment") return unknown();
    const amount = Number(p.amount);
    if (!Number.isFinite(amount) || amount <= 0 || String(p.currency || "").toUpperCase() !== currency) return unknown();
    if (!["deposit", "partial", "full", "refund"].includes(p.payment_type)) return unknown();
    paid += p.payment_type === "refund" ? -amount : amount;
  }
  return { paid, balance: Math.round((total - paid) * 100) / 100, currency, reconciled: true, related: related.length };
}
