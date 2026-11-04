import test from "node:test";
import assert from "node:assert/strict";
import { prepareImportBatchPayload, hasLegacyFixedImportCost } from "../src/lib/importBatchCosts.mjs";

test("prorrata no se convierte automáticamente en cargo fijo por unidad", () => {
  const batch = { customs_total: 100, freight_total: 50, local_transport_total: 25, extra_cost_total: 25, total_units: 10, per_unit_import_default: 0 };
  const saved = prepareImportBatchPayload(batch);
  assert.equal(saved.per_unit_import_default, 0);
  assert.equal(saved.customs_total + saved.freight_total + saved.local_transport_total + saved.extra_cost_total, 200);
});
test("conserva cargo adicional elegido explícitamente", () => {
  assert.equal(prepareImportBatchPayload({ freight_total: 100, per_unit_import_default: 7 }).per_unit_import_default, 7);
});
test("detecta cargo fijo legacy que necesita conciliación", () => {
  assert.equal(hasLegacyFixedImportCost({ per_unit_import_default: 20 }), true);
  assert.equal(hasLegacyFixedImportCost({ per_unit_import_default: 0 }), false);
});
test("payload no muta el formulario de origen", () => {
  const original = { customs_total: 100 };
  const payload = prepareImportBatchPayload(original);
  payload.customs_total = 200;
  assert.equal(original.customs_total, 100);
});
