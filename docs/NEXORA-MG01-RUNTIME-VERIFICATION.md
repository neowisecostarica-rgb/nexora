# MG01 — verificación del entorno activo
Fecha: 2026-10-21. Alcance: lectura del conector Base44 y GitHub; ninguna modificación de runtime.

## Evidencia
- PR #3 abierto, draft, sin merge. Head revisado: ed8c78fb380bffd6b089b95d11ee248b3aef6e91.
- GitHub Actions Tenant access tests, ejecución 39541331432: completed / success para ese commit. Son pruebas simuladas; no certifican RLS real.
- User: consulta selectiva id/role, limit 500: 1 usuario, Super Admin conocido. No existen dos identidades registradas para el ensayo cruzado.
- OrganizationProfile: consulta id/active, limit 500: 1 perfil activo. No se ha creado una segunda empresa.
- Esquemas activos consultados: OrganizationMembership y PartnerAccessGrant conservan mutaciones por role admin. PlatformAuditEvent no aparece entre los esquemas solicitados.
- OrganizationProfile activo no incluye organization_type ni las RLS server-only del PR.
Conclusión: las restricciones nuevas del PR todavía no están aplicadas a la app activa. No intentar validar tenantData ni certificar aislamiento contra esa versión.

## Puerta de salida de MG01
Preparar un entorno de prueba aislado que ejecute exactamente el commit del PR, con recursos/backend propios y sin datos productivos; no basta una URL frontend de preview si comparte backend.
Registrar en ese entorno dos cuentas de prueba distintas del Super Admin, dos empresas y una identidad de aliado. No usar credenciales inventadas ni modificar auth.me para simular sesiones reales.
Probar:
1. Dueño A y dueño B: CRUD propio permitido; listar/obtener/modificar/borrar IDs ajenos denegado, incluidas consultas OR.
2. SDK directo: denegación real por RLS para todos los roles de navegador, incluido admin; acceso a través del backend autorizado permitido.
3. Invocaciones backend anidadas: conservar identidad y empresa en runtime Deno.
4. Revocación, vencimiento y suspensión: nueva petición denegada.
5. Consulting: no certificar portal operativo por tener un grant. Los flujos dedicados aún son MG02; verificar su frontera financiera y exigir permisos por operación al implementarlos.
6. Documentos: comprobar almacenamiento y URL de descarga con sesión ajena y anónima; una fila restringida no convierte una URL pública en privada.
7. Regresión de ambos caminos de ventas, cálculo de costos, numeración y cambio de empresa en UI.
Guardar evidencia de resultados sin tokens, cookies ni datos personales de pruebas. Cron permanece sin reactivar.

## Estado
Bloqueado para certificación real por ausencia del entorno con versión candidata y de sesiones independientes. No desbloquear con más mocks ni con merge/publish a producción. No se borraron registros ni se asignó ownership.
