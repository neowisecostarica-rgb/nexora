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
