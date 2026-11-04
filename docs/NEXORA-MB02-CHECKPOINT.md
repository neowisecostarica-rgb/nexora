# NEXORA-MB-02 — Operación completa (checkpoint de ejecución)
Fecha: 2026-11-03 (Costa Rica)

## Fuente y separación
- Base: main f07ff11f7800a1384df1a9ec2b0710e4963a055e.
- Rama independiente: codex/nexora-mb02-operaciones-20261103.
- PR #3 seguridad: intacto, sin mezclar ramas.
- No hubo cambios en Base44, entidades, registros, migraciones, cron ni publicación.

## Hallazgo confirmado en código
PurchaseDetail.jsx marcaba PurchaseOrders.status=received al terminar el ciclo de invocaciones, sin releer los contadores persistidos en PurchaseItems. Un backend que devolviera resultado incompleto o un estado pendiente podría provocar cierre prematuro. No se certifica reproducido en runtime.

## Corrección aislada
- src/lib/purchaseConversion.mjs: pendientes y completitud por contadores persistidos.
- src/pages/Purchases.jsx y src/pages/PurchaseDetail.jsx: muestran importes con la moneda registrada de la orden (USD/MXN), sin hacer conversión FX.
- src/pages/PurchaseDetail.jsx: valida respuesta por ítem, relee PurchaseItems del backend, marca received únicamente con todas las partidas completas; errores visibles y refresco de consultas.
- tests/purchase-conversion.test.mjs: casos de orden vacía, parcial, completa y contadores ausentes.

## Pendiente del megabloque
- Conciliar los dos motores de costos sin alterar total_real_unit_cost.
- Confirmar idempotencia/concurrencia de generación de unidades (lock lógico actual NO garantiza exclusión atómica).
- Importación, costos, precios, inventario multicategoría y monedas requieren desarrollo y QA adicionales.
- No integrar este PR mientras no exista política segura multiempresa activa; base main todavía tiene bypasses P0.

## Puerta de calidad
Node tests/CI, lint, build y QA runtime sobre el HEAD del PR: NO VERIFICADO al crear esta nota.

## Entrega parcial ejecutada
Se abrió PR #4 en borrador. La corrección cubre cierre prematuro de compras y representación coherente de moneda en las pantallas de compras. **No representa la finalización de MB-02.** No se probaron persistencia de Base44, costos reales, concurrencia ni aislamiento multiempresa.

## MB-02 · Importaciones y costos (2026-11-03)

**Hallazgo financiero:** src/pages/ImportBatches.jsx calculaba automáticamente per_unit_import_default = (aduana + flete + transporte + extras)/total_units. Tanto calculateRealUnitCost como processRecalculationQueue ya distribuyen esos mismos totales proporcionalmente y además suman per_unit_import_default como cargo fijo separado. Por tanto existe riesgo de doble imputación de costos en lotes guardados mediante la UI. Es evidencia estática, NO se verificó el efecto sobre datos reales.

**Corrección en este PR:** la pantalla deja de recomputar automáticamente per_unit_import_default, expone cargo fijo adicional por unidad como campo explícito, advierte cuando un lote existente contiene ese valor, preserva los importes históricos sin cambiarlos. Se agregaron src/lib/importBatchCosts.mjs y tests/import-batch-costs.test.mjs (4 casos). No se modifica ninguno de los motores ni se recalculan registros.

**Riesgo y acción pendiente:** los lotes legacy con per_unit_import_default > 0 requieren clasificación documentada y conciliación humana antes de corregir valores o ejecutar recálculo. No suponer que todo importe fijo es duplicado: puede ser un cargo adicional válido. No activar workflows ni ejecutar migraciones. Validar en QA costo numérico y comparación entre los dos motores sin modificar la fuente de verdad total_real_unit_cost.

**Pruebas:** casos nuevos añadidos; ejecución específica sobre el HEAD, lint/build y QA real quedan sujetos a CI y validación posterior. No confundir PASS general de un workflow previo con la suite nueva.
