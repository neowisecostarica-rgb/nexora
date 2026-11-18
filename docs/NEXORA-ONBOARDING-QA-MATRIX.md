# NEXORA — Matriz QA de onboarding

Fecha: 2026-11-18. Alcance: entrada a plataforma, elección de empresa y primera escritura de proveedor. No habilita beta ni equivale a pruebas con usuarios reales.

| ID | Escenario | Prueba automatizada actual | Puerta API / QA humano pendiente |
|---|---|---|---|
| ONB-01 | Sesión anónima o vencida | Mensaje de 401 diferenciado | Login/logout real, 401 en tenantData sin token |
| ONB-02 | Usuario sin empresa autorizada | Contexto vacío válido; 403 diferenciado | Mensaje visible «Sin empresa operativa autorizada» |
| ONB-03 | Servicio de empresas ausente | Diagnóstico 404 específico | tenantData method=context responde en versión candidata correcta |
| ONB-04 | Selección de empresa A | Bridge transmite organization_id explícito | Cambiar A→B y validar listas/estado del selector |
| ONB-05 | Sin selección | Bridge no inventa organization_id | Backend deniega operaciones no globales y exige contexto |
| ONB-06 | Alta de proveedor | Ruta Suppliers.create → tenantData | Guardar y recargar; persistencia, error visible, sin duplicado |
| ONB-07 | Error de backend | Rechazo y ausencia de fallback CRUD | Error en UI y conservación del formulario |
| ONB-08 | Método CRUD no admitido | Bloqueo previo al gateway | Ningún bypass SDK directo |
| ONB-09 | Acceso a CRM | CustomerProfiles → moduleData | Escritura autorizada solo en tenant elegido |
| ONB-10 | Aislamiento y revocación | No cubierto por este archivo | Dos sesiones de empresas distintas, CRUD cruzado denegado, grant revocado |
| ONB-11 | Super Admin Gustavo | No cubierto por este archivo | Identidad verificada servidor; global auditado sin owner por defecto |
| ONB-12 | Consulting | No cubierto por este archivo | Grant explícito por operación; revocación/vencimiento inmediatos |
| ONB-13 | Documentos y archivos | No cubierto por este archivo | Descarga denegada con sesión ajena y anónima |

## Evidencia e interpretación

Las pruebas de contrato están en `tests/onboarding-contract.test.mjs`. Usan fake de `functions.invoke` y no escriben datos ni evalúan RLS real. Un PASS confirma solamente cableado y denegación local. Los casos ONB-03 y ONB-06 son la primera puerta de desbloqueo: el E2E del 4 de noviembre encontró servicio de empresas ausente y proveedor sin persistencia observable. No repetir el flujo financiero completo hasta superar esa puerta.

## Secuencia acotada

1. Verificar versión exacta de código/esquemas/backend de preview, `tenantData(method=context)` y `getActiveOrganizationProfile` con sesión autorizada.
2. Corregir causa de ONB-03 y repetir únicamente ONB-03/ONB-06.
3. Ejecutar ONB-01/02/04/05/07/09/10/11/12/13 con cuentas de prueba reales y registrar resultados API, no mocks.
4. Solo entonces pasar a `NEXORA-REGRESSION-MATRIX.md` y circuito comercial compra→venta→pago.

No publicar, fusionar PR, habilitar cron, migrar ownership ni sembrar datos reales sin autorización.
