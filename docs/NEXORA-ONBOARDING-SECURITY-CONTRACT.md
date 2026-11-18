# Nexora — Contrato de invitaciones seguras (P0)

Fecha: 18 noviembre 2026. Estado: **BLOQUEADO / NO OPERATIVO**. Este documento es especificación; no representa invitaciones enviadas ni cuentas creadas.

## Separación de autoridad

- Solo Super Admin autenticado puede crear y revocar invitaciones de una empresa existente. El Super Admin no adquiere membresía tenant.
- El destinatario debe registrarse y autenticarse con el correo previsto; comprobar su User ID y verificación real del correo, sin confiar en datos del navegador.
- Enviar una invitación de Base44 no constituye aceptación de membresía. No usar `users.inviteUser` automáticamente hasta autorizarlo.
- El usuario acepta el vínculo a una empresa explícita. Únicamente el backend activa `OrganizationMembership(owner, active)` al validar los requisitos.
- Una invitación revocada, vencida, usada o de una empresa suspendida falla cerrada.

## Protocolo propuesto (aún no implementado)

1. `platformAdmin.create_invite`: verifica autoridad, empresa y destinatario; genera token con CSPRNG de al menos 256 bits. Persistir solo SHA-256 del token, nunca el secreto. Caducidad corta y límite de intentos. No incluir token en URLs ni logs.
2. `platformAdmin.list_invites`: solo metadatos sin token, paginados y auditados.
3. `acceptOrganizationInvite`: recibe token en body POST, exige `auth.me()` verificado y correo exacto normalizado; confirma empresa, hash, estado y expiración; crea membresía owner solo al aceptar; registra evento auditado.
4. `platformAdmin.revoke_invite`: invalida token y, si procede, membresía por acción separada y explícita.
5. Los reintentos de una aceptación exitosa por el mismo usuario deben devolver el mismo resultado sin duplicar membresía; un usuario diferente no puede reutilizarla.

## Bloqueo técnico de seguridad

Las operaciones CRUD Base44 inspeccionadas (`filter/create/update`) no demuestran soporte de operación atómica condicional, índice único ni transacción que combine consumo de token con creación de membresía. Sin esas garantías, dos aceptaciones simultáneas podrían atravesar la verificación antes de la actualización y producir asignaciones duplicadas. No implementar una falsa garantía de token de un solo uso. Antes de habilitarlo, obtener contrato de compare-and-swap/índice único o diseñar un servicio transaccional autorizado y probarlo en runtime.

## Estado verificable

`platformAdmin.capabilities` publica `invitation_ready:false`. La UI debe impedir emitir/aceptar invitaciones mientras sea falso. Sin creación de token, envíos, datos reales, permisos ni publicación. Pruebas API con identidades independientes y carreras concurrentes siguen pendientes.

## Casos de aceptación obligatorios

- Usuario ajeno, correo alterado o no verificado: denegar.
- Empresa suspendida, token vencido/revocado/reutilizado: denegar.
- Reintentos duplicados y carrera concurrente: una sola membresía efectiva y evento auditable.
- SA nunca obtiene propiedad tenant por efecto lateral.
- Revocación de membership deniega la próxima petición, incluyendo subfunciones.
- Ningún token persiste en claro ni aparece en respuestas de listados, URL, auditoría o logs.
