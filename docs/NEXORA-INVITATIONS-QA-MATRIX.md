# NEXORA — matriz de seguridad para invitación y aceptación

Fecha: 2026-11-18. Alcance: onboarding de usuarios a una organización autorizada. Esta matriz define casos de aceptación y revocación sin sembrar usuarios ni empresas reales.

| ID | Caso de contrato | Resultado obligatorio | Prueba local | Prueba API real |
|---|---|---|---|---|
| INV-01 | Token válido, identidad invitada coincidente | Acepta una sola vez y crea membresía limitada a la empresa incluida en invitación | Pendiente de módulo | Pendiente |
| INV-02 | Token vencido | Rechaza, sin membresía ni consumo exitoso | Pendiente de módulo | Pendiente |
| INV-03 | Correo autenticado distinto al invitado | Rechaza incluso con token válido; no permite cambiar destinatario | Pendiente de módulo | Pendiente |
| INV-04 | Usuario destinatario no registrado | No crea usuario fantasma ni membresía; exige registro/autenticación antes de aceptar | Pendiente de módulo | Pendiente |
| INV-05 | Segunda aceptación del mismo token | No duplica membresías; responde estado seguro/idempotente | Pendiente de módulo | Pendiente |
| INV-06 | Invitación revocada | Rechaza aceptación posterior, incluso antes de vencimiento | Pendiente de módulo | Pendiente |
| INV-07 | Token de empresa A usado bajo contexto B | Nunca asigna empresa B ni permite alterar org_id desde el cliente | Pendiente de módulo | Pendiente |
| INV-08 | Invitado con rol de Super Admin | Jamás se asigna tenant owner por condición de Super Admin | Pendiente de módulo | Pendiente |
| INV-09 | Intento de manipular rol, empresa o destinatario | Valores del token/servidor prevalecen; no admin/owner escalable por payload | Pendiente de módulo | Pendiente |
| INV-10 | Emisor sin permisos o empresa suspendida | Rechaza emisión/aceptación sin crear membresías | Pendiente de módulo | Pendiente |
| INV-11 | Cadena de auditoría | Emisión, aceptación, revocación y rechazo relevante quedan auditados sin guardar token en claro | Pendiente de módulo | Pendiente |
| INV-12 | Dos sesiones independientes A/B y token revocado | Deniega cross-tenant y comprueba revocación en nueva solicitud | Pendiente de módulo | Pendiente |

## Puertas de liberación

- **Código:** contratos INV-01 a INV-10 automatizados con fakes y lógica real importable, no reproducciones de su implementación.
- **API:** registros y sesión independientes, pruebas de enumeración por ID, expiración, concurrencia, revocación y auditoría.
- **QA humano:** alta mediante invitación, enlace vencido y recuperación segura; UI sin exposición de token.
- **No-GO** si token reutilizable genera membresías múltiples, correo no coincide, usuario no existe, rol se eleva o hay filtración entre empresas.

Ninguna prueba simulada se calificará como certificación runtime. No modificar perfiles reales, permisos, publicación ni cron.
