# NEXORA-MASTER-001 — Plan maestro y checkpoint de beta privada

Fecha: 2026-11-02 (Costa Rica). Dirección: Nexora. Objetivo condicionado: beta privada viernes 2026-11-06.
Estado: fase 1 en revisión; no GO aún. Trabajar bloques de 2 horas, alternando con TRP; checkpoints separados.
Fuente de verdad: GitHub neowisecostarica-rgb/nexora. App Base44: 69d69fc4304f277844249dd6.
Este documento es un plan y checkpoint, no una certificación runtime ni autorización de merge/publish.

## Decisiones vinculantes
- Preservar módulos, rutas, datos, contratos históricos y workflows; no reconstruir desde cero.
- Gustavo es Super Admin de plataforma, NO dueño de las empresas por defecto. Autoridad en backend; no confiar en rol/email del navegador.
- No hay clientes reales actualmente según Dirección. La propia aplicación Base44 será el entorno de validación con empresas y usuarios ficticios identificados; NO crear un segundo entorno. Esto no exime de respaldos, pruebas de acceso, reversibilidad ni control de datos.
- GitHub fuente de verdad; separar código, pruebas, integración y publicación. No merge ni publish sin revisión/autorización.
- Orden del recorrido: compra → importación y gastos → costo real final → inventario y precios → CRM/cotización → venta y pago. Probar ambos caminos: reserva→venta y cotización→venta.
- Mantener catálogo maestro M1 separado de vista agrupada comercial, total_real_unit_cost e historial congelado de costo; no alterar fórmulas sin caso numérico reproducible.
- No reactivar cron ni efectuar migraciones o limpieza destructiva. Consultar ownership legacy y respaldar antes de transformaciones.
- Ideas adicionales al backlog; no rediseño estético salvo bloqueo real. No avanzar de fase sin registrar evidencias/bloqueos.

## Fases y condiciones de salida
1. P0 Seguridad y empresas: Super Admin, membresías, aislamiento empresa, revocación, compatibilidad legacy. Salida: dos empresas ficticias con sesiones reales; API/SDK, ID ajeno y revocación ensayados; acceso legacy preservado.
2. P0 Compras e importaciones: proveedores, órdenes, partidas, lotes, gastos. Salida: compra→unidades persistente sin duplicados al reintentar.
3. P0 Costos e inventario: conciliar ambos motores de costo, componentes, precios, stock, catálogos. Salida: caso numérico reproducible y stock consistente.
4. P0 CRM y cotizaciones: cliente, seguimiento comercial básico, cotización y proforma. Salida: documentos y datos correctos, histórico intacto.
5. P0 Ventas y pagos: caminos reserva→venta y cotización→venta, pagos, costo congelado. Salida: ambos caminos conciliados, sin ventas/abonos duplicados.
6. P0 QA y beta: roles, API, navegador, móvil/escritorio, integridad, regresiones. Salida: sin fallas P0; dictamen GO/NO-GO sustentado.

## Calendario objetivo (condicional)
- Lun 2 nov: Fase 1, permisos y continuidad.
- Mar 3 nov: Fases 2–3, compras, importaciones, costos.
- Mié 4 nov: Fases 4–5, CRM, cotizaciones, ventas.
- Jue 5 nov: Fases 5–6, pagos, QA.
- Vie 6 nov: GO/NO-GO beta privada. Reducir alcance antes de falsear estado de validación.

## Estado y evidencia al crear este checkpoint
- Documentación revisada: AGENTS.md; docs/README.md; NEXORA-BASELINE.md; NEXORA-INVENTORY.md; NEXORA-MG01-CHECKPOINT.md; NEXORA-REGRESSION-MATRIX.md.
- GitHub PR #3: draft abierto, candidato observado 40ace31ab1903a14fd80c2ba355ba1f595e69e6d antes de este documento. Se reportan 91 pruebas locales simuladas; NO certifican RLS/API.
- Revisados en código: tenantData/handler.mjs, tenant-access.mjs, entry.ts, tenantBridge.mjs y OrganizationSwitcher.jsx.
- Riesgos: usuarios sin membresías; RLS y sesiones reales; backend Deno/propagación de identidad; privacidad de archivos; costos y concurrencia de ventas; no evidencia runtime suficiente.
- Base44 main tiene estructura base y AGENTS.md; PR #3 aún no está integrado. No se han realizado cambios funcionales ni datos desde esta dirección.
- PR #3 NO debe integrarse solo por resultados de mocks; debe documentarse prueba real en la app actual, con respaldo y plan de reversión antes de aplicar cambios que restrinjan acceso.
- No se ha validado un porcentaje de avance real de la beta; evitar porcentajes ilustrativos como métricas.

## Disciplina de cada bloque de 2 horas
Registrar fecha, fase, rama/commit, alcance, acciones de código, pruebas locales, pruebas API reales, QA humano, integraciones, publicaciones, PASS/FAIL/BLOQUEADO con evidencia, datos afectados, pendientes, riesgos y siguiente acción exacta. Mantener checklists en documentación; no considerar marcada una tarea solo por una interfaz local.

## Siguiente acción exacta
Continuar Fase 1 en PR #3: revisar riesgos de compatibilidad legacy y diseñar la secuencia reversible para llevar gateway, guardas y RLS a la app actual sin bloqueos de acceso; realizar pruebas con dos usuarios y empresas ficticias antes de habilitar beta multiempresa. No integrar/publicar de forma automática.
