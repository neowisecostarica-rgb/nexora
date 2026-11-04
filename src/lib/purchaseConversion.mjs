/**
 * NEXORA MB-02 — comprobación de conversión de una compra a inventario.
 * Lee únicamente contadores de PurchaseItems; no escribe entidades.
 * Protege el estado de orden recibido: no confundir invocaciones exitosas
 * con persistencia completa. La comprobación no sustituye transacciones
 * ni garantías de concurrencia del backend.
 */
export function pendingPurchaseItems(items) {
  return items.filter((item) =>
    Number(item.inventory_generated_count ?? 0) < Number(item.quantity ?? 1)
  );
}

export function purchaseInventoryComplete(items) {
  return items.length > 0 && pendingPurchaseItems(items).length === 0;
}
