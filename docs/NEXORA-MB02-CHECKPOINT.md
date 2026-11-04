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

## MB-02 · Integridad de componentes financieros (2026-11-03)
- GitHub Actions 41767521954: node --test PASS, lint FAIL por nueve imports sin uso preexistentes y build SKIPPED. Se corrigieron solo esos imports en el PR #4; nuevo HEAD requiere CI.
- Comparación de ambos motores: ambos aplican base, aduana, flete, transporte, extras, fijo adicional y gastos por unidad/lote. Se encontró un defecto común: si falla la creación de uno o varios componentes pero otros se crean, ambos podían declarar éxito y actualizar total_real_unit_cost con la suma parcial.
- Corrección: tanto calculateRealUnitCost como runCostEngine del worker devuelven PARTIAL_COST_COMPONENTS si el conteo persistido no coincide con el esperado, antes de actualizar el costo oficial. Se incorporó una comprobación contractual estática en tests/cost-engine-safety-contract.test.mjs.
- **Límite:** NO hay transacción atómica; ante error los componentes previamente eliminados/creados pueden quedar en estado parcial, mientras el costo oficial anterior queda intacto. Necesita conciliación operativa y pruebas de fallos inducidos en Base44 antes de GO. No se ha demostrado paridad numérica E2E de ambos motores.
- No se ejecutaron cálculos contra datos reales, ni se habilitaron jobs, cron o migraciones.

## NEXORA-PAUSA-2026-11-03 · Checkpoint para retomar mañana (miércoles 4 de noviembre, Costa Rica)

**Decisión de Dirección General:** detener trabajo esta noche. No continuar pruebas, cambios, merges, publicaciones, migraciones, automatizaciones ni modificaciones de registros reales. Prioridad al retomar: cerrar integración segura, evitando acumular PR pendientes o desarrollar sobre una base antigua. No comenzar MB-03 todavía.

### Estado confirmado al pausar
- Repositorio fuente de verdad: `neowisecostarica-rgb/nexora`.
- PR #3 (seguridad/multiempresa/Super Admin): https://github.com/neowisecostarica-rgb/nexora/pull/3
  - `codex/nexora-mg01-platform-admin` sobre `main`.
  - HEAD previo a este checkpoint: `c881144e667688e1235460bd12ac764f9abd9be8`; abierto, borrador, **no merged**.
  - Base main reconciliada (conflicto anterior resuelto). Corrección del selector de empresa: errores de sesión/permisos/servicio con mensajes identificables, respuesta inválida rechazada y sin fallback a CRUD directo. Pruebas unitarias incorporadas.
  - GitHub Actions: PASS en SHA `c881144e667688e1235460bd12ac764f9abd9be8`, ejecución 41769993306.
- PR #4 (operaciones/importaciones/inventario/costos): https://github.com/neowisecostarica-rgb/nexora/pull/4
  - `codex/nexora-mb02-operaciones-20261103` tiene como **base el PR #3**, no `main`. Los cambios de selector se propagaron también al candidato combinado.
  - HEAD antes de guardar esta nota: `750bf70619135d657d6ea3fe1ee74ce562b57e81`; abierto, borrador, **no merged**.
  - Compras no se marcan como recibidas sin comprobar contadores persistidos; no se recomputa automáticamente el cargo fijo de importaciones; ambos motores rechazan publicación de un costo incompleto (`PARTIAL_COST_COMPONENTS`); pruebas y checkpoint financiero incluidos.
  - GitHub Actions: PASS (tests, lint y build) en SHA `750bf70619135d657d6ea3fe1ee74ce562b57e81`, ejecución 41770032242.
- **Ningún merge a `main`** de PR #3 o #4. **Ningún publish/deploy a Base44** durante esta fase; no hubo escrituras de registros de negocio.

### Bloqueador pendiente y límites de evidencia
- La prueba visual anterior del selector mostró «Reintentar empresas» con sesión de prueba; el cambio posterior mejora el diagnóstico, pero **no certifica su funcionamiento con sesión real**.
- Al intentar consultar OrganizationProfile, OrganizationMembership y PlatformAuditEvent a través del conector de Base44, este respondió `auth_required` («This app is private, You do not have access to this app»). No hay autorización/evidencia suficiente en este canal para un test runtime de dos empresas.
- GitHub CI PASS verifica código y pruebas simuladas, **NO** valida RLS/runtime real, permisos multiempresa, usuario legacy ni conciliación financiera completa.
- Motor financiero: proteger `total_real_unit_cost` de escrituras parciales no crea transacciones atómicas; puede haber componentes parciales que requieren conciliación. No tocar datos históricos sin análisis controlado.
- Beta privada: **NO-GO** hasta evidencias de aislamiento, compatibilidad y finanzas.

### Próxima sesión: solo NEXORA-MERGE-001 (en este orden)
1. Leer este checkpoint y los PR #3 y #4; confirmar nuevos HEAD y estado CI. **No repetir auditoría estática**.
2. Conseguir sesión autorizada de Base44 para QA real de usuarios de empresas A/B, Super Admin y usuario existente; verificar aislamiento en lectura, escritura, referencias cruzadas, revocación, selector y acceso legacy. Si sigue `auth_required`, declarar **BLOQUEADO** sin inventar PASS.
3. Ejecutar una única comprobación financiera controlada con costos de compra + importación + gastos, y confirmar no duplicación/no parcialidad sin alterar registros de clientes reales.
4. Si pruebas indispensables PASS, aprobar y hacer merge de PR #3 a `main`; luego retarget/reconciliar PR #4 contra ese `main`, verificar CI y hacer merge de PR #4. Confirmar SHA final de `main` y ausencia de PR pendientes. **Merge en GitHub ≠ publicar Base44**.
5. Solo con `main` consolidado continuar MB-03 (CRM, cotizaciones, proformas, ventas y pagos). No abrir ramas adicionales mientras permanezcan bloqueos de integración.

**Regla del usuario:** máximo trabajo aislado imprescindible; no acumular merges; preferir avances reales, cerrar ciclos y trabajar siempre sobre el `main` más reciente. Si no se supera la barrera de seguridad, no forzar merges ni desactivar controles.
