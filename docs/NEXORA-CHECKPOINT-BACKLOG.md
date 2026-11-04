# NEXORA — BACKLOG Y CHECKPOINT MAESTRO
**Actualizado:** 4 de noviembre de 2026 (Costa Rica). **Objetivo:** beta privada viernes 6 de noviembre de 2026, condicionada a resolver P0.
**Repositorio:** neowisecostarica-rgb/nexora. **Base44 app:** `69d69fc4304f277844249dd6`.
**Candidato único:** `codex/nexora-mg01-platform-admin` (PR #3). **Rama MB02:** `codex/nexora-mb02-operaciones-20261103` (PR #4, abierta como borrador).
**Fuente de verdad de código:** GitHub. **No hubo merge a main ni publicación**. `main` aún difiere del candidato (comparación 4-nov: candidato 49 commits adelante, 1 atrás).
**Política de cierre:** no repetir auditorías ni series de pruebas; una prueba de aceptación E2E-001 se ejecutó y quedó bloqueada en proveedor. Corregir P0 y validar solo el paso afectado antes de continuar. No declarar PASS en runtime a partir de código o mocks.

## 1. Cerrado en CÓDIGO (NO equivale a certificado o publicado)
| ID | Entregable | Estado comprobable | Evidencia |
| --- | --- | --- | --- |
| SEC-CODE-001 | Base multiempresa: Super Admin, membresías, permisos, tenantData, restricciones de entidades y guardas legacy | **CERRADO EN CÓDIGO / API real NO VERIFICADA** | PR #3; checkpoint MB49 |
| OPS-CODE-001 | Proveedores, compras, bloqueos de orden recibida, cantidades válidas y cierre con recuentos persistidos | **CERRADO EN CÓDIGO / E2E BLOQUEADO** | `PurchaseDetail.jsx`, `Purchases.jsx`, reconciliación MB02 |
| COST-CODE-001 | No duplicar prorrata de importación y cargo fijo por unidad | **CERRADO EN CÓDIGO / FINANZAS NO VERIFICADAS** | `importBatchCosts.mjs`, `ImportBatches.jsx` |
| COST-CODE-002 | Ambos motores no publican `total_real_unit_cost` cuando persisten componentes parciales | **CERRADO EN CÓDIGO / CASO REAL PENDIENTE** | `calculateRealUnitCost`, `processRecalculationQueue`; CI corregida `06435d7` |
| CRM-CODE-001 | Perfiles e interacciones de clientes y prospectos, seguimiento básico | **CERRADO EN CÓDIGO / FLUJO REAL PENDIENTE** | `CustomerProfiles`, `CustomerInteractions`, `Customers.jsx` |
| LOG-CODE-001 | Bodegas y seguimiento de embarques: entidades, pantallas y gateway de acceso por empresa | **CERRADO EN CÓDIGO / USO REAL PENDIENTE** | `Warehouses`, `ShipmentTrackings`, `moduleData` |
| SALES-CODE-001 | Conversión de cotización a venta en backend, congelamiento de costo y protección lógica contra doble clic | **IMPLEMENTADO EN CÓDIGO / CONCURRENCIA Y E2E NO CERTIFICADOS** | `convertQuoteToSale`, `QuoteDetail.jsx` |
| SALES-CODE-002 | Campos opcionales declarados en GitHub: Sales, SaleItems, Quotes; sin modificar RLS/required | **CERRADO EN GITHUB / APLICACIÓN DE ESQUEMAS EN BASE44 PENDIENTE** | commits `7dc05a2`, `22c35da`, `51ac02c` |
| UI-CODE-001 | Error visible al fallar guardar proveedores | **CERRADO EN CÓDIGO / NO REVALIDADO** | `Suppliers.jsx`, commit `573cfa2` |
| QA-CI-001 | Suite automatizada de código y compilación en GitHub Actions | **PASS de CI (NO PASS API real)** | run `41879109344`, éxito para commit `b822430`; precedente `41876103436` PASS |

## 2. BLOQUEOS P0 — resolver antes de habilitar beta
- [ ] **P0-01 — Servicio de empresas y escritura. BLOQUEO DE DESPLIEGUE DE RAMA CONFIRMADO.** En E2E-001, sidebar: «No se encontró el servicio de empresas en esta versión». El proveedor `QA-NEXORA Proveedor` no se persistió. El archivo `base44/functions/tenantData/entry.ts` y su handler están presentes en la rama Base44, pero al intentar redesplegar manualmente `tenantData` únicamente sobre `codex/nexora-mg01-platform-admin`, la API de Base44 rechazó la acción con «Manual code editing is not available on branch 'codex/nexora-mg01-platform-admin'. Do this on the main branch, or merge this branch first.» La imposibilidad de redesplegar desde rama es CONFIRMADA; que esa sea la única causa del 404 sigue NO VERIFICADO. No aplicar workaround con CRUD directo, no quitar RLS. La acción posterior necesita un plan seguro de integración a main, con conciliación del commit que falta y autorización de merge; luego activar los contratos backend y validar puntualmente el servicio de empresas.
- [ ] **P0-02 — Aplicación de esquemas y funciones en versión candidata oficial.** Base44 runtime todavía no tiene confirmación de todos los campos opcionales comerciales declarados en GitHub. Sin garantizar `Sales.quote_id`, no certificar idempotencia de venta.
- [ ] **P0-03 — Integración histórica GitHub y publicación controlada.** Adoptados los cambios operativos de PR #4 en rama PR #3, preservados helpers/tests/registro MB02. Historia PR #3/#4 continúa divergente. Conciliar `main` (1 commit detrás) y cerrar PRs sin sobreescribir el candidato. Aún **no merge, no deploy**.
- [ ] **P0-04 — Garantía de concurrencia y aislamiento.** Locks lógicos (`conversion_in_progress`) no son transacciones ni índices únicos. Comprobar seguridad backend entre 2 empresas antes de exponer datos o ventas. Preservar costos históricos y evitar doble stock/cobro.
- [ ] **P0-05 — Aceptación del recorrido comercial completo.** E2E-001 se detuvo en proveedores. Compra→importación/gastos→costo final→inventario/precios→cotización→venta→pago, reserva→venta, saldos y stock **NO VERIFICADOS**. No repetir suite completa hasta resolver P0-01.

## 3. Pendientes funcionales NO-P0 / alcance secundario
- [ ] CRM oportunidades como entidad y transición completa a cotización (existen perfiles, interacciones y seguimiento básico).
- [ ] Proformas con numeración separada y documentos consistentes.
- [x] **UI parcial de abonos y saldos por venta en pantalla existente, cerrada en código:** `Sales.jsx` consulta `Payments` por gateway tenant, usa helper conservador `saleBalances.mjs`; solo computa pagos confirmados en la moneda explícita de la venta y con consulta completa. Sin moneda / registros incompletos / ajuste ambiguo, muestra pendiente de conciliar. Nuevas cotizaciones permiten seleccionar USD/CRC y `convertQuoteToSale` conserva esa moneda; esquemas `Quotes` y `Sales` extienden campo `currency` opcional. **NO VERIFICADO runtime ni pago real; NO se creó un registro nuevo.**
- [ ] Registrar abonos/cancelaciones/devoluciones y verificar conciliación operativa en backend; no declarar saldo exacto en documentos sin certificar.
- [x] **Portal Consulting read-only implementado en código:** `partnerOverview` valida sesión, membresía owner de empresa tipo partner, grant vigente, permiso `operations.read`, ID de carga y propiedad del importador antes de devolver un DTO mínimo; `tracking.read` controla las guías, sin notas libres, datos financieros ni CRUD. `ConsultingPortal.jsx` es ruta `/consulting` fuera del layout financiero. Defaults de grants para demo: `operations.read` + `tracking.read`. **NO VERIFICADO en Base44 runtime ni apto para invitación real antes de aceptación y despliegue.**
- [ ] Documentos publicados y permisos dedicados `documents.read`, hitos completos, escritura autorizada: fuera del alcance de esta vista de beta; NO se expone información documental privada sin endpoint verificado.
- [ ] Preferencias internacionales por empresa: países, moneda base, idioma/locale y categorías multicategoría; conservar moneda por documento sin inventar FX.
- [ ] Revisión de ownership legacy, registros y backups antes de cualquier migración/limpieza.
- [ ] Guía breve de beta y QA visual móvil/escritorio solo una vez resueltos P0.

### 3B. Preparación de integración (sin merge)
- Comparación GitHub posterior: la rama candidata y `main` siguen divergentes por **un commit en main**; la diferencia de contenido de ese commit aparece en `package.json` y `package-lock.json`, pero se verificó que **los blob SHA de ambos archivos son idénticos en main y la rama candidata** (`93e2595...` y `7a4ac18...`). Por tanto la discrepancia es de historia, no de esos dos archivos actualmente. Esto reduce el riesgo de conflicto de contenido al integrar PR #3, pero no prueba que el backend Base44 permita el cambio ni sustituye la revisión de release.
- **Sin autorización explícita de merge no se actualizó main.** La plataforma Base44 exige integrar rama o editar directamente main para redesplegar `tenantData`; no se usó esa opción unilateralmente.

## 3A. Hallazgo técnico P0-01 — 4 nov, 12:15 CR
- Revisión de archivos: `src/components/layout/OrganizationSwitcher.jsx` invoca `base44.functions.invoke('tenantData',{method:'context'})`; `src/lib/organizationContext.mjs` mapea 404 a mensaje de servicio no encontrado. `src/api/tenantBridge.mjs` envía CRUD empresarial a `tenantData` y no tiene fallback inseguro. Los archivos `tenantData/entry.ts` y `handler.mjs` están presentes en el sandbox de la rama.
- Intento controlado: API de Base44 `coding/redeploy-function/tenantData`, con `branch_id` de la rama, rechazado por restricción de edición manual de funciones en ramas. **Ninguna función fue redesplegada, ni main ni producción modificados.**
- Decisión: **no ejecutar más QA/E2E** hasta resolver la restricción de despliegue. Integración en `main` requiere verificación y autorización; después comprobar `tenantData` una vez, sin desactivar RLS.

## 3C. Cierre en código para beta Consulting (4 nov, sin QA funcional)
- Ventas: se añadió lectura no destructiva de abonos y saldos sobre la misma pantalla `Sales.jsx`, en vez de crear vista nueva. Solo toma ledger de pagos confirmados; ignora pendientes, bloquea ajustes ambiguos, exige moneda explícita, no inventa cambio de divisas ni cifras sobre resultados truncados.
- Cotizaciones: selector USD/CRC en nuevas cotizaciones; la conversión al crear Sales preserva moneda. Campos opcionales declarados en esquemas, sin cambiar RLS/required ni documentos históricos. El ledger legacy sin moneda permanece «Sin moneda conciliada» hasta regularización autorizada.
- Consulting: ya existe configuración de empresas `partner`, grants por importador/carga y auditoría en `PlatformAdmin` (código), pero **NO hay todavía portal de aliado autenticado verificado**. Para mostrar beta a Consulting como usuario real, se requiere acceso por cuenta propia, grants limitados, navegación permitida y prueba de que no ve datos financieros ni otro cliente. La pantalla Super Admin NO se entregará como portal Consulting.
- Release por instrucción de Dirección: **construcción restante → QA final una vez → resolución P0 → merge PR #3 a main → actualización de esquema/funciones en Base44 → publicación y verificación → cerrar PR #4 de forma segura → eliminar ramas solo después de comprobar código preservado y entrega beta**. Sin autorización para borrar ramas antes de verificar que no se pierdan commits históricos.
- Pendiente técnico principal: `tenantData` no puede redeplegarse manualmente en rama Base44. Evitar pruebas repetidas y evitar bypass del gateway.

## 3D. Consulting — cierre de construcción, pendiente de QA final (4 nov)
- Código nuevo: `base44/functions/partnerOverview/handler.mjs` + `entry.ts`, `src/pages/ConsultingPortal.jsx`. Se reutilizan `PartnerAccessGrant`, `OrganizationMembership`, `OrganizationProfile`, `ImportBatches`, `ShipmentTrackings`; no se crearon entidades ni un panel Super Admin paralelo.
- Ruta `/consulting` fuera de `AppLayout` para evitar que la demo enseñe navegación financiera. La autorización es **backend**, no una condición visual. Se verifica pertenencia real, organización de tipo partner, grant no revocado/no expirado, permiso `operations.read`, cliente importador activo y ownership de cada lote; las guías exigen además `tracking.read`. Proyección mínima de código de lote, estado, fechas, courier/guía/estado. Sin importes, datos de clientes individuales ni texto libre del courier.
- `PlatformAdmin.jsx` actualizado con permisos iniciales de lectura y explicación para configurar el acceso. **No se enviaron invitaciones ni se asignaron accesos a Consulting**.
- `tests/partner-overview-security.test.mjs`: cuatro pruebas estáticas/unitarias de control de identidad, autorización, ownership y redacción; resultado GitHub CI se verificará al finalizar el commit. No sustituye QA con dos identidades.
- Limitaciones: falta habilitar funciones de backend en Base44 tras integrar rama, autenticar una cuenta real de Consulting, comprobar permisos y demostrar visualmente la beta. Documentos y edición de tracking permanecen fuera de esta vista de beta.

## 3E. Cierre de barrera de seguridad para aliados (4 nov; QA runtime al final)
- Se incorporó `PARTNER_PORTAL_ONLY` en la política canónica `base44/policies/tenant-access.mjs` y en sus 24 copias de funciones Deno (total 25 archivos, commit `76dc60ea`). Toda empresa `organization_type=partner` con owner no Super Admin queda fuera del CRUD `tenantData` y de los 22 endpoints legacy que reutilizan `clientForRequest`.
- `moduleData/entry.ts` ahora deniega CRUD satélite a organizaciones partner (commit `dc705bdb`). El portal `partnerOverview` sigue siendo la única lectura prevista para Consulting, con membresías y grants activos validados en servidor.
- `tests/tenant-isolation.test.mjs` incorpora contrato de denegación de CRUD general a partner (commit `21a1561d`). GitHub CI se verifica por separado; no declarar PASS runtime sin desplegar.
- Esta protección **no entrega** por sí sola la beta: `partnerOverview` requiere deploy de rama integrada, backend del servicio de empresas operativo y un usuario partner real con grants autorizados. No hay invitaciones ni migraciones ejecutadas.

## 4. Última prueba única (registrada, no repetir por rutina)
**NEXORA-E2E-001 (Base44 Testing Agent):** flujo `6aeb6c595b84480c188e65d2`; ejecución `6aeb6c5d81f0fc35f6420cb1`; preview de rama. Sesión y formulario proveedores accesibles; guardado ficticio FALLÓ, servicio de empresas no encontrado. El resto NO VERIFICADO. No se tocó producción ni registros históricos en esta prueba, según reporte del agente.
**Checkpoint detallado:** `docs/NEXORA-E2E-001-CIERRE-2026-11-04.md`.

## 5. Decisiones vigentes y criterio de entrega
1. **Solo Nexora** en este backlog; no abrir otros proyectos.
2. **Meta 6-nov condicionada a P0.** Reducir alcance secundario si es necesario; no llamar GO a una beta con empresas/escrituras bloqueadas.
3. Prioridad: reparar servicio de empresas → confirmar escritura proveedor de forma puntual → aplicar/conciliar esquemas y backend → consolidar PR #3/#4 → aceptación mínima comercial y seguridad → decidir GO/NO-GO y publicar con autorización.
4. No abrir otra rama, no crear sandbox adicional, no repetir Testing Agent indiscriminadamente ni activar cron. Reutilizar componentes, preservar historial.
5. Gustavo es Super Admin de plataforma y no owner tenant por defecto. Consulting no tiene acceso financiero global.
6. GitHub es fuente de verdad; sin merge/publish automático ni migraciones destructivas.

## 6. Referencias y continuidad
- PR #3: https://github.com/neowisecostarica-rgb/nexora/pull/3
- PR #4: https://github.com/neowisecostarica-rgb/nexora/pull/4
- `docs/NEXORA-MASTER-001-CHECKPOINT-2026-11-02.md`
- `docs/NEXORA-MB02-CHECKPOINT.md`
- `docs/NEXORA-MB-49H-CHECKPOINT-2026-11-04.md`
- `docs/NEXORA-E2E-001-CIERRE-2026-11-04.md`
- `docs/NEXORA-REGRESSION-MATRIX.md`

### Frase para retomar
«Retomemos Nexora desde docs/NEXORA-CHECKPOINT-BACKLOG.md. No más auditorías; resolver P0-01 (servicio de empresas/escritura), consolidar PR #3/#4 y cerrar beta del 6-nov con evidencia, sin publicar hasta autorización».

## Release candidate — 4 noviembre
- PR #3 es candidato único; PR #4 se conserva abierto como referencia sin merge directo.
- GitHub Actions 41887989572 PASS en SHA 2d3cface; esto no certifica runtime.
- Conexión Base44/GitHub activa; falta resolver la limitación de backend de la rama.
- Orden: terminar código, QA final una vez, integrar candidato con autorización, sincronizar Base44, publicar con GO, comprobar beta Consulting y solo después retirar ramas redundantes.
- Bloqueos de aceptación: servicio de empresas, esquemas comerciales en runtime, aislamiento real de Consulting y circuito de cobro.

## Integración a main y aceptación — 4 noviembre
- PR #3 fusionado en GitHub main como commit f9a84d77177137316fe60197eff792a42402c8a8 (merge autorizado en esta conversación). Base44 main reporta exactamente el mismo SHA.
- Checkpoint Base44 previo a merge: 6aeb7cd85bbae972b98f7d80 (SHA 88b18377). Checkpoint post-merge: 6aeb7e8d5c2b7a696b47ca4f (SHA f9a84d77).
- Schemas revisados en Base44 main: Sales, Quotes, SaleItems y PartnerAccessGrant contienen los campos esperados, con RLS server-only.
- PR #4: NO fusionar independientemente; sigue abierto como histórico hasta comprobar entrega beta. Las ramas no se eliminarán antes de resolver QA y publicación.
- **Estado:** main consolidado, NO equivale a publicación. Una única ejecución final E2E sobre preview main fue solicitada: ID 6aeb7ea8050276b34325d043. Pendiente dictamen; NO declarar GO por adelantado.
- Próximo gate: resultado E2E, verificación real de backend tenantData y acceso Consulting. Si falla, NO publicar. Si pasa, resolver permisos de una cuenta real Consulting y preparar GO de beta.

### Dictamen de ejecución final del 4-nov (main integrado)
- E2E-001 replay único en preview principal: `6aeb7ea8050276b34325d043`; resultado FAIL/BLOQUEADO, `goal_accomplished=false`; Base44 registró 2,1 créditos de integraciones. No ejecutar otra corrida hasta resolver precondición.
- El selector **Empresa de trabajo** mostró «Sin empresa operativa autorizada» y no permitió comenzar con compras. Se abrió y canceló el formulario de compra. No se crearon datos QA ni se modificaron datos de negocio, permisos o cron, según el agente.
- **NO** demuestra que la empresa no exista: únicamente que la sesión empleada carece de empresa operativa seleccionable. No confundir este fallo con el anterior `tenantData 404`, cuya resolución real tampoco quedó certificada.
- Lectura directa de OrganizationProfile, OrganizationMembership y PartnerAccessGrant por conexión Base44 fue rechazada porque la app es privada (`auth_required`); no se forzaron credenciales ni se intentaron bypass. Validación de miembros y creación de empresa de prueba necesita sesión autorizada de Super Admin o owner y permisos explícitos.
- Merge PR #3 en GitHub: f9a84d77. Base44 main reconoció ese SHA y schemas `Quotes`, `Sales`, `SaleItems`, `PartnerAccessGrant` con campos esperados y RLS server-only. Checkpoints Base44 6aeb7cd85bbae972b98f7d80 (previo), 6aeb7e8d5c2b7a696b47ca4f (post-merge).
- **NO-GO** de publicación/entrega Consulting. Desbloquear empresa operativa y sesión de prueba autorizada, después retomar solo aceptación pendiente. PR #4 histórico y ramas quedan sin borrar hasta beta certificada. Ningún deploy ni invitación a Consulting efectuado.
