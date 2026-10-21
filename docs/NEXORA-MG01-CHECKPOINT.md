# Nexora MG01 — empresas y permisos
20 octubre 2026. Estado: fundamento propuesto; aislamiento operativo NO certificado.

## Entrega
Política pura con denegación por defecto. Roles owner/staff/buyer.
Consulting accede mediante grant explícito por empresa y operación, sin finanzas.
Comprador requiere publicación y destinatario explícitos.
Revocaciones y vencimientos se comprueban en cada decisión.
Esquemas de membresías/grants restringen escritura directa a admin.
24 pruebas: node --test tests/organization-access.test.mjs

## Integración pendiente obligatoria
userId debe proceder de sesión autenticada. Membresías, grants y recursos deben cargarse en servidor, nunca confiar en JSON del navegador.
La política no protege por sí sola endpoints ni CRUD SDK existentes.
1. Inventariar ownership legacy y preparar migración reversible sin asignar datos ambiguos.
2. Completar organization_id en todas las entidades operativas.
3. Aplicar RLS y autorizaciones a TODAS las funciones, consultas y archivos.
4. Administración segura de membresías/grants, selección de empresa y revocación.
5. Pruebas API reales con dos empresas, aliado y comprador; acceso por ID y revocación.
6. Build y regresiones de compras/costos/ventas.
No activar nuevos usuarios multiempresa hasta certificar estos pasos.

## Lista maestra
1 Diagnóstico: revisión parcial de código; configuración activa/datos/runtime pendientes.
2 Empresas/permisos: fundamento propuesto; integración pendiente.
3 Núcleo operativo: concurrencia, pricing, métricas y consumo pendientes.
4 Productos/inventario: unidades/series/lotes/cantidades/Excel pendientes.
5 Presupuesto de importación: monedas, escenarios, estimado vs real pendiente.
6 Expediente: pedidos/embarques/documentos/recepciones pendiente.
7 Panel Consulting: clientes/cargas/trackings/actualizaciones pendiente.
8 Portal comprador: consulta privada/documentos/novedades pendiente.
9 Recepción/costo final: diferencias/reclamos/cierre trazable pendiente.
10 Panel dueño: indicadores completos y reconciliados pendiente.
11 Piloto/distribución: demo/caso completo/soporte/acuerdo pendiente.

## Evidencia previa conservada
getActiveOrganizationProfile consulta perfil activo global.
Reservas/ventas/pagos usan service role sin ownership explícito en funciones revisadas.
Reservar/vender son escrituras secuenciales, sin atomicidad demostrada.
Workflow pricing observa real_unit_cost, costo oficial total_real_unit_cost.
Dashboard limita inventario a 200 y ventas a 100; espera campos ausentes en Sales revisado.
Compras solo USD/MXN; ImportBatches usa USA/Mexico por defecto.
CRON existe en código; estado activo y consumo runtime sin verificar.

Esta rama no migra datos ni cambia los endpoints existentes. No merge/publish realizado.

## Avance posterior — perfil por empresa
getActiveOrganizationProfile ahora deriva acceso de membresías owner autenticadas y consulta el perfil por ID. Consultas globales eliminadas de esta función. Perfil completo reservado al dueño por contener datos bancarios. Se mantienen filtros de revocación/vencimiento y selección explícita si hay varias empresas.
31 pruebas locales aprobadas (24 política + 7 handler con cliente simulado). No son pruebas API reales. Workflow GitHub agregado para ejecutar la suite; resultado remoto aún por verificar.
BLOQUEO DE MERGE: los usuarios legacy no tienen membresías migradas; integrar ahora bloquearía su consulta de perfil. Migración, frontend, otras funciones, RLS operativo y compatibilidad de despliegue del handler.mjs siguen pendientes. main y publicación no modificados.

## Megabloque administrativo posterior
Ver NEXORA-MG01-PLATFORM-DELIVERY.md. Super Admin separado de ownership, panel /platform, auditoría, usuarios/aliados e informe de transición preparados. 65 pruebas locales y build pasan; sin certificación RLS/API ni migración real. MG01 sigue abierto.
