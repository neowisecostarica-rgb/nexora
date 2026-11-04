# NEXORA-MB-49H — Checkpoint de consolidación y cierre, 2026-11-04

Rama de trabajo: `codex/nexora-mg01-platform-admin` (Base44). No se creó otra rama, otro PR, ni se hizo merge/publish.
Base de partida documental: AGENTS.md, docs/README.md, NEXORA-BASELINE.md, NEXORA-MB-48H-RECONCILIACION-2026-11-04.md.

Regla de lectura: **REAL** = código presente + prueba local ejecutada este bloque. **PARCIAL** = código presente, prueba local parcial o limitada a contrato simulado. **BLOQUEADO** = el entorno de esta rama impide ejecutarlo.

---

## 1. Reconciliación prioritaria (GitHub PR #3 / PR #4)

**Estado: BLOQUEADO (historia) — PARCIAL (correcciones de código adoptadas).**

- No existe en esta sesión acceso de integración a GitHub (sin conector autorizado, sin operación de merge por herramienta). No se intentó ni se simuló una reconciliación de historia; `main` no fue tocado.
- Se leyó el contenido público de PR #4 (https://github.com/neowisecostarica-rgb/nexora/pull/4): 23 commits apilados sobre PR #3, reconciliados en `91359f5`, con cuatro correcciones operativas: recuentos persistidos antes de marcar compra recibida, protección de partidas en orden recibida, no duplicación de cargos fijos de importación, y no publicar `total_real_unit_cost` con componentes parciales.
- En lugar de integrar la historia (imposible aquí), se adoptaron las correcciones equivalentes en el código de esta rama (ver §2.2 y §2.3). Las correcciones de PR #4 en `distributeImportCosts` no se reescribieron: esa función es hoy un redireccionador a la cola y el worker ya elimina componentes antes de recrearlos (ver §2.3), por lo que no se duplican cargos fijos.
- **Divergencia pendiente real:** la rama MB02 tiene 27 commits que esta rama no tiene y esta rama tiene trabajo que MB02 no tiene (CRM, bodegas, tracking, `moduleData`). La consolidación de historia sigue siendo una tarea de GitHub, no de Base44.

---

## 2. Construcción efectiva

### 2.1 Gateway multiempresa de módulos satélite — REAL (contrato) / PARCIAL (runtime)

- `base44/functions/moduleData/entry.ts`: gateway para `Warehouses`, `ShipmentTrackings`, `CustomerProfiles`, `CustomerInteractions`. Reutiliza la autoridad existente (`tenantData` → `method: context`) en vez de duplicar resolución de membresías; filtra siempre por `organization_id`; deniega por defecto; valida referencias dentro de la empresa (cliente, bodega, lote/orden/unidad); no permite cambiar ownership ni campos de sistema.
- `src/api/tenantBridge.mjs`: enruta esas cuatro entidades a `moduleData` y deja el resto en `tenantData`. Sin fallback a CRUD directo.
- Prueba API real ejecutada: `moduleData` responde 200 con listas vacías para `Warehouses` y `ShipmentTrackings` (sin datos sembrados). **No** se crearon registros: la rama no permite escrituras de datos.
- **Motivo del gateway separado:** el allowlist canónico de `tenantData` vive en `base44/policies/tenant-access.mjs`, archivo de plataforma no editable en rama. Se restauró `base44/functions/tenantData/tenant-access.mjs` a igualdad exacta con el canónico (compila y pasa la prueba de paridad).

### 2.2 Camino cotización → venta — REAL (código) / PARCIAL (runtime)

Problema corregido: la conversión se hacía en el navegador con escrituras multi-paso y campos que no existen en el esquema de `SaleItems` (`unit_cost`, `unit_sale_price`, `unit_profit`, `margin_percent_at_sale`). El costo congelado se perdía y el margen se calculaba sobre costo 0.

- Nuevo `base44/functions/convertQuoteToSale/entry.ts` (+ `tenant-access.mjs` copiado del canónico):
  - Idempotente por `Sales.quote_id`: si ya existe venta, devuelve `ALREADY_CONVERTED` sin duplicar.
  - Rechaza unidades ya `sold` y unidades fuera de la empresa autorizada.
  - Congela costo desde `InventoryUnits.total_real_unit_cost` (SOT) y solo cae a `legacy_real_unit_cost` cuando el motor aún no lo calculó (fallback documentado, no publica componentes parciales).
  - Escribe `SaleItems` con `unit_price_sold`, `unit_cost_frozen`, `line_total`, `profit_amount`, `description` (campos reales del esquema, `description` pendiente de declarar — ver §3).
  - Usa `generateDocumentNumber` (type=sale) para numeración y marca la unidad `sold` solo después de crear la venta.
  - Marca lógica `Quotes.conversion_in_progress` para evitar doble clic; **no** es atómico y así está declarado.
- `src/pages/QuoteDetail.jsx`: la conversión pasa a una sola invocación al backend, con mensajes de error y refresco de inventario/ventas. Se eliminó la escritura de estado `"quoted"` en `InventoryUnits` (valor inexistente en el enum): una cotización ya no cambia el estado del stock; la unidad se marca vendida al convertir.
- Evidencia: build aprobado; la función despliega y falla cerrada (409 `TENANT_ACCESS_DENIED`) al invocarse sin sesión autorizada.

### 2.3 Guardas financieras y de compras — REAL (código) / PARCIAL (runtime)

- `base44/functions/processRecalculationQueue/entry.ts`: **fail closed**. Si algún componente de costo no persiste, ya no se publica un `total_real_unit_cost` parcial: se devuelve `PARTIAL_COMPONENTS` con conteos y la cola marca el registro `failed`. La unidad conserva su último costo conocido.
- `src/pages/PurchaseDetail.jsx`:
  - El cierre de la orden se decide por **recuentos persistidos releídos del servidor**; si queda una partida incompleta, la orden no pasa a `received` y se informa.
  - Errores de la función de conversión ya no se silencian (`result.data.error` corta el flujo).
  - Orden `received`/`closed`: no admite nuevas partidas (validación + botón oculto).
  - Cantidad validada como entero ≥ 1 y subtotal no negativo.

### 2.4 Cierre de caja del camino reserva → venta — sin cambios

`createReservation`, `cancelReservation`, `convertReservationToSale`, `createPayment`, `expireReservations` no se modificaron: no hay evidencia nueva que obligue a cambiarlos y el mandato prohíbe reescribir sin prueba. Su QA API sigue **pendiente**.

---

## 3. Bloqueos reales de esta rama (no son deuda de diseño)

1. **Cambios de esquema en entidades existentes — BLOQUEADO.** Se intentó agregar campos opcionales a `Sales` (`sale_number`, `sale_date`, `status`, `sale_type`, `quote_id`, `customer_id`, `cogs_total`, `gross_profit_total`, `gross_margin_percent`, `sale_notes_snapshot`, `organization_profile_snapshot`, `external_invoice_status`, `external_invoice_reference`), a `SaleItems` (`description`) y a `Quotes` (`sale_id`, `converted_at`, `conversion_in_progress`). Las tres escrituras fueron rechazadas por la plataforma: la comparación contra `main` detecta cambio en `rls`, aunque el bloque se mantuvo idéntico. **Acción en `main`:** declarar esos campos opcionales (sin marcarlos requeridos, sin tocar `rls`); el código ya los escribe. Hasta entonces, la persistencia de `sale_number`/`quote_id` depende de la tolerancia del backend y **no está verificada**; la idempotencia por `Sales.quote_id` queda como contrato a confirmar.
2. **Workflows — BLOQUEADO.** En rama no se crean ni modifican workflows. Los workflows del motor de costos, expiración de reservas, limpieza de locks y distribución de importación no se tocaron ni se reactivaron.
3. **Escrituras de datos — BLOQUEADO.** No se sembraron ni migraron registros. No hay datos históricos modificados.
4. **QA API multiempresa real — PENDIENTE.** Requiere dos usuarios de empresas distintas, membresías reales y datos sembrados; esta rama no permite crear registros. Las pruebas de aislamiento son locales/simuladas y **no certifican** aislamiento en runtime.
5. **Reconciliación de historia GitHub — BLOQUEADO** (§1).

---

## 4. Archivos modificados en este bloque

| Archivo | Cambio |
|---|---|
| `base44/functions/moduleData/entry.ts` | Gateway nuevo de módulos satélite (bodegas, tracking, CRM) |
| `src/api/tenantBridge.mjs` | Enrutamiento a `moduleData` para esas cuatro entidades |
| `base44/functions/tenantData/tenant-access.mjs` | Restaurado a igualdad exacta con el canónico de políticas |
| `base44/functions/convertQuoteToSale/entry.ts` | Conversión cotización→venta en servidor, con costo congelado e idempotencia |
| `base44/functions/convertQuoteToSale/tenant-access.mjs` | Copia canónica del guard (requerida por el empaquetado Deno) |
| `src/pages/QuoteDetail.jsx` | Conversión vía backend; se retiró la escritura de estado inválido |
| `src/pages/PurchaseDetail.jsx` | Cierre por recuentos persistidos, bloqueo de orden recibida, validación de cantidad |
| `base44/functions/processRecalculationQueue/entry.ts` | Fail closed si faltan componentes de costo |
| `tests/tenant-isolation.test.mjs` | Igualdad de copias normalizando salto de línea final; `moduleData` reconocido como gateway, no como entrada legacy |

---

## 5. Evidencia mínima ejecutada

- `npm run build` → exit 0, sin errores.
- Suites locales: `organization-access` 25/25, `organization-context-ui` 2/2, `organization-profile` 7/7, `platform-admin` 33/33, `tenant-isolation` 26/26 → **93 pruebas, 0 fallos**.
- `convertQuoteToSale` desplegada y ejecutada: falla cerrada sin sesión (409 `TENANT_ACCESS_DENIED`).
- `moduleData` desplegada y ejecutada: 200 con `result: []` en `Warehouses` y `ShipmentTrackings`.
- No se ejecutaron cron, migraciones, borrados ni publicación.

---

## 6. Faltantes funcionales (no implementados en este bloque)

1. Oportunidades CRM como entidad propia y su conversión a cotización (hoy existen perfil comercial, interacciones y seguimiento).
2. Saldos/abonos visibles por venta en UI (el ledger `Payments` existe; no hay vista de saldo conciliado por venta).
3. Integración de la numeración de proforma separada de cotización (hoy una sola secuencia de cotización).
4. Portal Consulting limitado por empresa con documentos publicados (hay grants administrados, sin portal dedicado).
5. QA API real multiempresa, conciliación numérica de ambos motores de costo y prueba de ambos caminos de venta en paralelo.

---

## 7. Siguiente acción recomendada

1. En `main`: agregar los campos opcionales listados en §3.1 (Sales, SaleItems, Quotes) para que la venta congelada persista de forma declarada.
2. Sembrar un juego de datos de prueba (una empresa, un lote, una unidad, una cotización) y ejecutar el circuito compra→importación→costo→inventario→cotización→venta→pago con dos sesiones de empresas distintas.
3. Resolver la consolidación de historia con PR #3 / PR #4 en GitHub, sin sobrescribir `moduleData`, CRM, bodegas ni tracking.
4. Solo después: declarar seguridad y finanzas PASS. Hoy: **NO certificado**.