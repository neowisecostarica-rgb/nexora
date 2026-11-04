/**
 * NEXORA MB-02 — prepara lotes sin recalcular cargos fijos.
 * Los cuatro costos agregados son distribuidos por los motores de costos.
 * per_unit_import_default es un cargo separado y se conserva sin cambios.
 * No realiza escritura ni conversión FX.
 */
export function prepareImportBatchPayload(form) {
  return { ...form };
}
export function hasLegacyFixedImportCost(batch) {
  return Number(batch?.per_unit_import_default || 0) > 0;
}
