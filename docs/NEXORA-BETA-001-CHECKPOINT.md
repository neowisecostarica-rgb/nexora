# NEXORA-BETA-001 — Plan maestro y checkpoint ejecutivo

**Fecha:** 2026-11-03 (Costa Rica)  
**Aplicación Base44:** `69d69fc4304f277844249dd6`  
**Bloque:** NEXORA-MB-01 — SEC-001 y LEG-001  
**Estado:** NO-GO; propuesta en PR borrador, sin merge, publicación ni migración de datos.

## Línea base comprobada

- GitHub `main`: `f07ff11f7800a1384df1a9ec2b0710e4963a055e`.
- Base44 `main` activa: `f07ff11f7800a1384df1a9ec2b0710e4963a055e`.
- Ramas GitHub detectadas: `main`, `codex/nexora-preservation-docs`, `codex/nexora-mg01-access-foundation` y `codex/nexora-mg01-platform-admin`.
- PR existente: #3, borrador, `codex/nexora-mg01-platform-admin`; está **divergente** de `main` (8 commits adelante y 2 detrás). No se asume integrado ni apto para merge.
- Base44 solo expone la rama `main`. No se creó entorno ni rama Base44 adicional.

## Implementación propuesta (PR #3, no integrada)

La rama borrador contiene el diseño de identidad de Super Admin del lado servidor, administración de empresas/membresías, grants acotados y revocables para Consulting, auditoría transversal, selector de empresa y una capa `tenantData`/puente para eliminar CRUD directo de frontend. También propone ownership inmutable y RLS en esquemas operativos.

Esta implementación sigue sin certificación runtime: su propia evidencia es simulada y la rama no está reconciliada con la línea base actual. No se deben presentar estos cambios como controles activos en Base44.

## Hallazgos de la línea base activa

1. `createReservation`, `convertReservationToSale` y `createPayment` autentican usuario, pero acceden y escriben con `asServiceRole` sin verificar `organization_id`, membresía ni grant. Existe fuga cruzada por ID.
2. La política `organization-access.mjs` es pura: no se aplica automáticamente a los endpoints ni al SDK.
3. `getActiveOrganizationProfile` exige membresía owner y selección explícita cuando hay varias empresas, pero no implementa Super Admin y no cubre el resto de recursos.
4. Las entidades activas no tienen ownership completo y consistente: por ejemplo `Sales`, `Payments` y `OrganizationProfile` carecen de `organization_id` en el esquema remoto.
5. Hay rutas frontend con CRUD SDK directo; el frontend no puede constituir una frontera de autorización.
6. Existe una propuesta de RLS/tenant bridge en PR #3, pero no ha sido desplegada ni probada contra las APIs reales.
7. Ambos caminos de venta siguen presentes y deben preservarse: reserva→venta y QuoteDetail→venta. No se alteraron costos, reservas, ventas ni pagos.

## LEG-001 — transición reversible requerida

No se ejecutó migración. Antes de habilitar los controles estrictos, preparar una tabla/archivo de mapeo versionado fuera de datos productivos con: tipo de entidad, ID legacy, `organization_id` candidato, evidencia, responsable, fecha, estado (confirmado/ambiguo/omitido) y rollback. Solo registros con evidencia inequívoca reciben ownership; los ambiguos quedan inaccesibles para el rollout estricto y se resuelven manualmente. No inferir tenant desde email, navegador ni el Super Admin.

Inventario pendiente de ejecución contra datos autorizados: usuarios, perfiles de empresa, y registros de las entidades operativas. No se consultaron ni modificaron datos reales.

## Validación ejecutada sobre Base44 main

| Prueba | Resultado | Evidencia |
| --- | --- | --- |
| Política de acceso y perfil | PASS | `node --test tests/organization-access.test.mjs tests/organization-profile.test.mjs`: 31/31 |
| Build frontend | PASS | `npm run build` |
| Lint | FAIL | `npm run lint`: 9 imports sin uso preexistentes (ImageManager, Catalog, Dashboard, Inventory, Settings) |
| Dos empresas / lectura por ID / escritura | NO VERIFICADO | No hay sesiones/datos de prueba autorizados |
| Consulting, grant, revocación y vencimiento reales | NO VERIFICADO | Solo mocks/unitarias |
| Super Admin real y auditoría transversal | NO VERIFICADO | No desplegado |
| RLS/SDK directo/archivos/funciones en API | NO VERIFICADO | No desplegado; la línea base presenta bypasses |
| Integridad de ventas, finanzas, inventario y catálogo | NO VERIFICADO | No se alteraron ni se ejecutó QA API |
| Automatizaciones/cron | NO TOCADO | Restricción respetada |

## Riesgos y bloqueos abiertos

- P0: aislamiento multiempresa inexistente en funciones operativas activas.
- P0: no hay prueba API real con dos empresas, Consulting, revocación ni Super Admin.
- P0: ownership legacy incompleto; forzar RLS/membresías sin mapa confirmado puede cortar acceso legítimo.
- P0: la rama #3 diverge de `main`; requiere reconciliación revisada, no merge automático.
- P1: lint base falla; resolver separadamente o justificar explícitamente antes de una puerta de calidad.
- P1: permisos de archivos y contrato de jobs/workflows sin identidad siguen sin verificar. No reactivar cron para probar.
- Restricción de Windows: el checkout local completo encuentra un nombre legacy de workflow con `:`; la inspección y pruebas se realizaron en el sandbox Base44, que conserva el archivo intacto.

## Recomendación

**NO-GO.** Mantener el PR #3 como borrador. Antes de cualquier integración: (1) reconciliar manualmente con `main`, (2) completar mapa reversible de ownership legacy, (3) ejecutar pruebas API autorizadas con dos empresas, Consulting, Super Admin y revocación, (4) validar archivos y funciones, y (5) ejecutar la matriz de regresión para ambos caminos de venta y finanzas. No hacer merge, publicación, migración real ni activación de automatizaciones hasta contar con esa evidencia.

## Archivos modificados en este checkpoint

- `docs/NEXORA-BETA-001-CHECKPOINT.md` (creado en la rama del PR #3).

