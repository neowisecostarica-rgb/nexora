# MG01 — actualización de aislamiento de módulos existentes
Base: 026740125a5d35a4af88a2190acd8449f00486f4.
Rama/PR: codex/nexora-mg01-platform-admin / PR3. Estado: borrador, NO merge/publish.

## Implementado en código
- Gateway tenantData sustituye CRUD directo de pantallas mediante tenantBridge, conservando firmas list/filter/get/create/update/delete.
- Todas las lecturas tenant agregan AND con organization_id autorizado; OrganizationProfile se liga por id.
- Creaciones inyectan ownership verificado; actualizaciones no pueden cambiar ownership ni identidad de sistema.
- Referencias de compras/inventario/cotizaciones/ventas/pagos/reservas se validan dentro de la empresa. Gastos validan también vínculo dinámico.
- 22 funciones heredadas usan guard local idéntico; getActiveOrganizationProfile y platformAdmin conservan sus fronteras específicas; endpoint archivado sigue 410.
- Llamadas anidadas usan transporte de usuario, con contexto validado. NO usan service-role de forma que pierda identidad de usuario.
- 20 entidades de negocio niegan CRUD SDK directo a roles admin/user; solo los endpoints backend autorizados usan service role.
- Selector de empresa en navegación: al cambiar recarga para separar cachés y formularios.
- Super Admin puede revisar legacy globalmente, auditado; crear registros exige empresa explícita activa. No se asigna legacy automáticamente.
- Membresía owner habilita los módulos financieros antiguos de SU empresa. Staff y buyer se deniegan en esos módulos: su acceso se construirá en flujos específicos, sin exponer finanzas por herencia.
- Los grants de Consulting se administran, pero no se interpretan como acceso financiero al CRUD legado; portal operativo dedicado pertenece al MG02.

## Preservación
No se elimina ninguna pantalla, ruta, entidad o workflow existente.
No se modifican fórmulas de costos/precios/ventas. Se envuelve el acceso a datos.
El guard respeta límites y orden de consulta del SDK existente; no convierte métricas limitadas en totales completos.
Numeración rechaza selección global ambigua si hay varias empresas: requiere seleccionar una.
Los cron no se reactivan. Llamadas sin sesión autenticada fallan cerradas. Si algún scheduler está activo, necesita contrato de identidad de servicio validado antes del rollout.

## Evidencia local
91 pruebas aprobadas: 65 previas + 26 de aislamiento/gateway/bridge/guardas.
Build frontend aprobado y artefacto generado.
ESLint dirigido a bridge/selector/política aprobado.
Sintaxis TypeScript comprobada en 26 entry.ts mediante transpileModule; NO equivale a compilación Deno desplegada.
git diff --check aprobado.

## Bloqueos actuales del megabloque (no cerrarlo todavía)
1. Pruebas API reales de Base44 con dos empresas y dos sesiones distintas: CRUD directo, ID ajeno, revocación, suspensión, permisos y no filtración.
2. Confirmar comportamiento RLS del rol imposible __server_only__ y formato de filtros AND.
3. Verificar despliegue de módulos mjs locales y propagación de identidad/contexto entre functions.invoke.
4. Preparar transición de datos con propietario confirmado. Los registros sin organization_id solo se revisan como Super Admin; no son visibles para tenants.
5. Certificar privacidad de archivos/documentos: restringir referencias no vuelve privado un URL previamente público.
6. QA de formularios y selector móvil/escritorio.
7. Mantener la advertencia previa sobre concurrencia/atomicidad de reservas, ventas y auditoría; el aislamiento no aporta transacciones ni índices únicos.
8. Roles staff/buyer y grants necesitan sus flujos específicos del MG02; no anunciar operación completa de Consulting todavía.

## Rollout
No integrar este PR sin un entorno/branch de prueba que permita validar esquemas, gateway y funciones juntos.
No activar RLS empresarial en producción sin gateway/guardas desplegados y verificados: rompería el CRUD antiguo.
No crear propietarios ficticios ni vincular a Gustavo como dueño. No ejecutar migraciones por inferencia.
No merge ni publish realizado por el agente; main no cambia con esta entrega.
