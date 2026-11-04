# NEXORA-BETA-001 — Plan maestro y checkpoint ejecutivo

**Fecha:** 2026-11-02 (Costa Rica)
**Aplicación Base44:** `69d69fc4304f277844249dd6`
**Estado:** Plan registrado; ejecución y QA pendientes.
**Objetivo:** beta privada con fecha objetivo **viernes 2026-11-06**, condicionada a evidencias y aprobación de Dirección General.
**Modalidad:** bloques de trabajo de dos horas, alternando con TRP.
**Fuentes internas:** `AGENTS.md`, `docs/README.md`, `docs/NEXORA-BASELINE.md`, `docs/NEXORA-INVENTORY.md`, `docs/NEXORA-MG01-CHECKPOINT.md`, `docs/NEXORA-REGRESSION-MATRIX.md`.

## 1. Reglas de gobernanza

1. GitHub es la fuente de verdad; identificar y verificar el repositorio correcto antes de reconciliar diferencias. No confundir repositorios homónimos encontrados en búsquedas públicas.
2. Preservar código, entidades, rutas, datos legacy, catálogos y ambos caminos de venta. No refactorizar destructivamente para alcanzar la fecha.
3. No hay clientes reales todavía: **no es requisito crear entornos de prueba adicionales**. Usar datos controlados y sesiones de prueba en el entorno existente, sin tocar datos de negocio sin autorización.
4. Ningún PASS, seguridad certificada, beta autorizada, integración o comportamiento runtime se declara sin evidencia técnica y QA.
5. No ejecutar migraciones destructivas, activar cron/workflows, hacer merge ni publicar sin autorización expresa.
6. Registrar siempre responsable, SHA/base, prueba, resultado, riesgos y siguiente acción. Aislar cada cambio y mantener reversible la migración de permisos.
7. Consultoría/Consulting es aliado autorizado que asesora, coordina cargas y distribuye; cliente importador es el cliente de ese servicio, no crear portal adicional de comprador final por defecto.
8. Super Admin administra plataforma y no es owner automático de tenants; autenticación y permisos se verifican del lado servidor. No usar correo o rol genérico del navegador como autorización.
9. Multicategoría, varios idiomas y monedas son requisitos; selección concreta y cobertura completa aún no están aprobadas/verificadas.

## 2. Ruta crítica ordenada

| ID | Prioridad | Bloque | Estado al registrar | Criterio de cierre |
| --- | --- | --- | --- | --- |
| SEC-001 | P0 | Super Admin, identidad, membresías, grants, aislamiento multiempresa | BLOQUEADO / no certificado | API real con dos empresas y sesiones distintas; acceso transversal autorizado y auditado; revocación; CRUD y funciones protegidos |
| LEG-001 | P0 | Compatibilidad de usuarios y datos legacy | PENDIENTE | inventario de ownership; migración reversible; usuarios preexistentes no pierden acceso |
| FIN-001 | P0 | Proteger los dos caminos de ventas y pagos | PENDIENTE | cotización→venta y reserva→venta consistentes; costo histórico y ledger correctos; permisos y concurrencia evaluados |
| COM-001 | P1 | Compra, partidas, importación y gastos | PENDIENTE QA | compra→unidades→lote→gastos reproducible, persistente y sin duplicados |
| COST-001 | P1 | Costo real unitario y pricing | PENDIENTE QA | cálculo conciliado, sin divergencias entre motor y worker; perfiles de precios verificados |
| INV-001 | P1 | Inventario, catálogo y existencias | PENDIENTE QA | disponibilidad, conversiones, imágenes, stock y vista agrupada verificadas |
| QTE-001 | P1 | Cotizaciones y proformas | PENDIENTE QA | documento y snapshot de empresa persistentes; conversión sin pérdida de historial |
| SAL-001 | P1 | Ventas, cobros, cancelaciones | PENDIENTE QA | venta, pagos parciales, cancelación y reembolsos consistentes, sin duplicaciones |
| E2E-001 | P0 | Flujo integral de beta privada | BLOQUEADO por SEC/LEG/FIN y QA | compra→importación→gastos→costo final→inventario→cotización→venta→pago con persistencia verificada |
| QA-001 | P0 | Regresión API + QA humano móvil/escritorio | PENDIENTE | evidencias de matriz y defectos P0 cerrados o beta restringida expresamente aprobada |
| P2-001 | P2 | Consulting/tracking ampliado, multicategoría, idiomas/monedas avanzados | DIFERIDO | backlog explícito; no bloquear piloto por funciones no incluidas salvo seguridad |

## 3. Secuencia de trabajo

**Bloque A: seguridad (primero).** Reconciliar Base44/GitHub, esquemas actuales y controles de acceso, confirmar estado de usuario legacy, identificar rutas SDK y backend que todavía eluden ownership. No activar nuevos usuarios multiempresa antes de pruebas reales.

**Bloque B: operación.** Probar compras, importación, gastos, costos y pricing con un caso numérico reproducible; no modificar cálculo oficial `total_real_unit_cost` sin prueba comparativa.

**Bloque C: comercial.** Probar inventario, cotizaciones y **ambas** rutas de creación de ventas; preservar `SaleItem.unit_cost_frozen` para camino de reservas, conciliando contrato del camino QuoteDetail y ledger Payments.

**Bloque D: cierre.** Ejecutar matriz `NEXORA-REGRESSION-MATRIX.md`, validar UX móvil/escritorio y emitir GO / GO CONDICIONADO / NO-GO. Fecha del 6 de noviembre es objetivo, no autorización automática.

## 4. Riesgos conocidos y restricciones

- `NEXORA-MG01-CHECKPOINT.md` registra 31 pruebas locales (política + handler simulado), **no** pruebas API de aislamiento.
- `NEXORA-BASELINE.md` advierte consultas globales en UI, permisos incompletos, diferencias entre campos de ventas, dos cálculos de costos y dos caminos distintos a venta.
- El estado activo de workflows, automatizaciones y consumo runtime sigue **NO VERIFICADO**; no reactivar cron para probar.
- Historial de monedas, FX, idiomas, soporte regulatorio de categorías y logística multicliente no están certificados.
- Este plan no presupone existencia de clientes reales ni obliga entornos adicionales.

## 5. Puertas de liberación

**GO:** P0 de seguridad/compatibilidad/finanzas y E2E con evidencia API y QA; sin defectos críticos.

**GO condicionado:** únicamente alcance restringido documentado, sin exposición multiempresa insegura y con aceptación explícita de Dirección General.

**NO-GO:** cualquier fuga entre empresas, autorización basada en cliente, pérdida de acceso legacy, inconsistencia financiera crítica, duplicación de venta/cobro o falta de evidencia imprescindible.

## 6. Estado de ejecución y próximo paso

A fecha 2026-11-02: **plan y documentación registrados; no se certifica ejecución funcional ni beta lista**. Siguiente tarea: identificar repo GitHub auténtico y comparar HEAD con Base44; levantar matriz de brechas SEC-001 / LEG-001 / FIN-001 en solo lectura. Después proponer cambios acotados y pruebas antes de implementarlos.

**Registro de cambios:** 2026-11-02: creación documental de plan maestro; sin cambios de lógica, entidades, permisos, datos, automatizaciones o publicación.


## 7. MB-01B — reconciliación y cierre técnico (2026-11-03)

**Base reconciliada:** `f07ff11f7800a1384df1a9ec2b0710e4963a055e` (GitHub y Base44 main al inicio de la tarea). Se incorporaron manualmente los dos cambios válidos de main a la rama del PR: actualización de `@base44/sdk`/`@base44/vite-plugin` y su lockfile, y este checkpoint maestro. No se ejecutó merge ni se sobrescribió Base44.

**Código P0 revisado:** `createReservation`, `convertReservationToSale` y `createPayment` del PR construyen primero un cliente de tenant desde la identidad autenticada; el acceso a entidades mediante service role queda mediado por contexto de empresa, membresías y validación de referencias. El borrador también contiene RLS y una frontera de datos para CRUD directo. Esto es evidencia de código, no certificación runtime.

**Calidad local disponible en main:** política/perfil 31/31 PASS; build PASS; lint inicialmente FAIL por nueve imports sin uso preexistentes. Se retiraron solamente esos imports en la rama del PR. La rama no está desplegada en Base44 ni tiene una ejecución CI confirmada para el SHA posterior a la reconciliación, por lo que lint/build/regresiones del head final son **NO VERIFICADO**.

**LEG-001:** no se migraron datos. La transición sigue siendo un mapa reversible de ownership con evidencia y estados confirmado/ambiguo/omitido; no se asignan registros ambiguos ni se bloquean usuarios legacy por esta entrega.

**API real:** NO VERIFICADO. Faltan sesiones autorizadas de dos empresas, Consulting y Super Admin para probar listas, lectura por ID, escrituras, archivos, funciones, grants, vencimiento y revocación.

**Resultado:** **NO-GO**. Mantener PR #3 como borrador. Antes de integrar o publicar: reconciliar/validar el head final en un sandbox autorizado, completar el inventario legacy, ejecutar la matriz de regresión (compras, inventario, cotizaciones, ambos caminos de venta y pagos) y obtener evidencia API real. No activar cron ni ejecutar migraciones.


## 8. MB-01D — desbloqueo de validación (2026-11-03)

**SHA objetivo de validación:** `249c68755628b8c0a9e58aed71e92530a63c69f8`.

| Verificación | Resultado | Evidencia |
| --- | --- | --- |
| Checkout íntegro Windows | BLOQUEADO | Git for Windows rechaza el árbol por el workflow histórico `base44/workflows/ImportBatch: Distribuir costos al actualizar.jsonc`; no se renombró ni alteró. |
| WSL/Linux local | BLOQUEADO | `wsl.exe --status` informa que el subsistema/distribución no está instalado; instalarlo crearía un entorno, por lo que no se hizo. |
| GitHub Actions del SHA objetivo | NO VERIFICADO | La consulta de runs del commit devolvió cero ejecuciones; el conector disponible no expone despacho de workflow. |
| Base44 contra rama GitHub | NO DISPONIBLE | La documentación/capacidades Base44 disponibles separan ramas Base44 de ramas GitHub. `list_branches` del app muestra solo `main`; el sandbox se inicia desde su último commit Base44 y no puede seleccionar una rama GitHub externa. |
| Lint/build/node --test del SHA objetivo | NO VERIFICADO | Dependen de un checkout íntegro Linux o runner CI. No se usó `main` como sustituto. |

**Alternativa de menor riesgo:** Dirección General debe autorizar un runner Linux efímero, sin secrets productivos ni deploy, que haga checkout exacto del SHA y ejecute solo `node --test`, `npm run lint` y `npm run build`. Para runtime, debe crear o habilitar una rama/sandbox Base44 que contenga explícitamente el SHA del PR, sin publicar, y proporcionar datos controlados: empresas A/B, owner de cada una, Consulting con grant de una sola operación, Super Admin autenticado y un caso de grant revocado/vencido. La matriz API debe cubrir listas, GET por ID, create/update/delete, archivos, funciones, referencias cruzadas y ambos caminos de venta/pagos.

**Estado:** NO-GO sin modificación funcional, merge, publicación, migración ni cron.


## 9. Validación Linux del candidato — runner no disponible (2026-11-03)

**SHA funcional solicitado:** `249c68755628b8c0a9e58aed71e92530a63c69f8`. No se ejecutó una sustitución sobre `main`.

| Control de runner | Resultado | Evidencia |
| --- | --- | --- |
| WSL | NO DISPONIBLE | `wsl.exe -l -q` informa que Windows Subsystem for Linux no está instalado. |
| Docker | NO DISPONIBLE | `docker` no está instalado. |
| Podman | NO DISPONIBLE | `podman` no está instalado. |
| GitHub Actions del SHA | NO VERIFICADO | El SHA no tiene runs asociados y el conector habilitado no ofrece despacho manual de workflow. |

Por tanto, `npm ci`, `node --test`, `npm run lint` y `npm run build` **no se ejecutaron en Linux**. No hay evidencia nueva PASS/FAIL para el SHA funcional: el estado exacto es **NO VERIFICADO por falta de runner autorizado disponible**.

**Procedimiento reproducible para un runner Linux efímero autorizado, sin secrets productivos:**

```bash
git clone https://github.com/neowisecostarica-rgb/nexora.git nexora
cd nexora
git checkout --detach 249c68755628b8c0a9e58aed71e92530a63c69f8
node --version
npm --version
npm ci
node --test
npm run lint
npm run build
```

Guardar stdout/stderr y códigos de salida por comando. Comparar cualquier fallo con la línea base documentada, sin corregir fallos ajenos al candidato dentro de este bloque. Aun con estos comandos PASS, se requerirán pruebas API reales antes de certificar seguridad.
