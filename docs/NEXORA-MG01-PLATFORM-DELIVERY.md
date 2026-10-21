# Megabloque 1 — administración de plataforma y accesos
Fecha: 20 octubre 2026 (Costa Rica).
Base: 026740125a5d35a4af88a2190acd8449f00486f4.
Estado: implementación administrativa en rama; NO habilitar clientes multiempresa todavía.

## Entregado en código
- /platform: empresas, usuarios y accesos, aliados, informe legacy e historial.
- Autoridad de Super Admin: ID autenticado de Gustavo + email + rol admin. No basta email ni admin genérico; no se confiere ownership tenant.
- platformAdmin es frontera HTTP; cada acción autoriza de nuevo en servidor.
- Alta/clasificación/suspensión de organizaciones. Plataforma/aliado/importador son tipos distintos.
- Membresías para usuarios ya registrados, modificación y revocación. No envía invitaciones.
- Grants a Consulting por cliente y cargas concretas. Solo operaciones cuyo organization_id coincide; sin permiso financiero.
- getActiveOrganizationProfile admite Super Admin auditado sin membresía owner y mantiene camino owner.
- PlatformAuditEvent registra lecturas e intentos/resultados de escritura; historial paginado.
- Informe de 18 entidades detecta registros sin empresa o con referencia desconocida, sin modificarlos.
- organization_id opcional añadido a esquemas que carecían del campo; no se asignan valores legacy.
- Mutaciones directas de memberships/grants pasan a servicio backend; el rol imposible __server_only__ no existe en enum User (admin/user).
- Política pura corregida para denegar nombres de prototipo sin excepción.

## Evidencia
65 pruebas locales aprobadas (política, perfil, autoridad y administración con SDK simulado).
npm run build exit 0.
ESLint dirigido a PlatformAdmin y política exit 0.
git diff --check aprobado.
Sin cambios de lógica en costos, pricing, compras, cotizaciones o ventas.
No se ejecutaron migraciones ni escrituras de datos en la app conectada.
Build de frontend no certifica despliegue Deno ni RLS en Base44.

## Contratos y diccionario nuevos
PlatformAuditEvent: actor_user_id (auth.me), action (lectura/intento/completado), target_id (registro objetivo), occurred_at (UTC ISO), detail (metadatos mínimos).
OrganizationProfile.organization_type: importer, partner o platform; clasificación explícita, sin default sobre legacy.
OrganizationMembership: organization_id (perfil empresarial), user_id (User registrado), role (owner/staff/buyer), status (active/revoked), expires_at (opcional).
PartnerAccessGrant: partner_organization_id/client_organization_id, permisos limitados, operation_ids de ImportBatches en esta fase, status/expires_at.
buyer es etiqueta técnica conservada del PR1: visor del cliente importador. No representa comprador final de mercadería.

## Riesgos y límites que bloquean cierre del MG01
1. CRUD directo y funciones operativas antiguas aún requieren aislamiento completo. El panel NO vuelve seguro automáticamente el SaaS entero.
2. Crear una membresía/grant no conecta todas las pantallas antiguas ni constituye autorización para abrir el producto a clientes.
3. Suspender una empresa no revoca por sí solo accesos a endpoints antiguos aún sin proteger. Validar empresa activa en esos endpoints.
4. Grant valida ownership, pero cargas legacy sin empresa no se autorizan. Migración necesita identificar propietario por evidencia.
5. No hay garantía transaccional ni índice único demostrado: concurrencia de altas/grants y atomicidad de auditoría deben certificarse antes de uso concurrente. Se registra intento antes de mutar; si auditoría final falla, la mutación puede haber ocurrido. No reintentar ciegamente.
6. Solo existe la cuenta Super Admin observada. Se necesitan sesiones reales adicionales para certificar aislamiento API y revocación.
7. Las reglas __server_only__, serialización de expires_at nulo y empaquetado de módulos locales .mjs deben verificarse en Base44. Las pruebas simuladas no los certifican.
8. Autoridad duplicada en dos paquetes locales por despliegue independiente; prueba exige igualdad exacta.
9. Cuentas futuras requieren registro/autorización de incorporación; este bloque no envía correos ni crea usuarios sin consentimiento.
10. Lecturas paginadas no son snapshot transaccional bajo mutaciones concurrentes. Informe detiene si excede 10.000 registros por entidad.

## Orden de validación antes de merge y publicación
- Verificar esquemas y función en entorno/branch de prueba autorizado; no usar datos reales para simular otros tenants.
- Confirmar que auditoría exista antes de activar el handler de perfil.
- Probar sesión Gustavo: panel + perfil sin membresía owner; otro admin/usuario debe ser rechazado.
- Probar revocación en módulos integrados y denegación CRUD directo real de memberships/grants.
- Completar aislamiento de toda la operación, migración reversible y selector/contexto de empresa antes de incorporar importadores.
- QA móvil/escritorio y errores de formularios.
No merge/publish realizado por el agente.

## Lista de megabloques
MG01: administración implementada en rama; aislamiento integral y QA runtime pendientes (bloque abierto).
MG02: importaciones/Consulting/tracking/documentos/recepción/multicategoría/idiomas/monedas pendientes.
MG03: reconciliación de operación existente, métricas, QA integral y piloto pendientes.
