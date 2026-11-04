import test from "node:test";
import assert from "node:assert/strict";
import { pendingPurchaseItems, purchaseInventoryComplete } from "../src/lib/purchaseConversion.mjs";

test("una orden vacía no se considera recibida", () => {
  assert.equal(purchaseInventoryComplete([]), false);
});

test("las unidades incompletas mantienen la orden pendiente", () => {
  const items = [{ id: "a", quantity: 3, inventory_generated_count: 2 }, { id: "b", quantity: 1, inventory_generated_count: 1 }];
  assert.deepEqual(pendingPurchaseItems(items).map(x => x.id), ["a"]);
  assert.equal(purchaseInventoryComplete(items), false);
});

test("la orden solo queda completa si cada partida alcanzó su cantidad", () => {
  const items = [{ quantity: 3, inventory_generated_count: 3 }, { quantity: 2, inventory_generated_count: 2 }];
  assert.equal(purchaseInventoryComplete(items), true);
});

test("contadores ausentes se consideran pendientes; no se concede completitud", () => {
  assert.equal(purchaseInventoryComplete([{ quantity: 1 }]), false);
});
