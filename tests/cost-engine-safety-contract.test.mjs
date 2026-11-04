import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Contract guard for BOTH existing engines. This is static evidence, not runtime API QA.
// Do not allow an incomplete cost-component write to update the authoritative unit cost.
for (const path of [
  "base44/functions/calculateRealUnitCost/entry.ts",
  "base44/functions/processRecalculationQueue/entry.ts",
]) {
  test(`${path}: partial components must fail before SOT update`, () => {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    const guard = source.indexOf("createdComponents.length !== validComponents.length");
    const update = source.indexOf("InventoryUnits.update(inventoryUnitId");
    assert.ok(guard >= 0, "partial persistence guard missing");
    assert.ok(update > guard, "authoritative cost updated before guard");
    assert.ok(source.includes("PARTIAL_COST_COMPONENTS"), "explicit failure code missing");
  });
}
