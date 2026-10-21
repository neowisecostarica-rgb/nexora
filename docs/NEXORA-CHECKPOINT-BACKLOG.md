# Nexora — checkpoint y backlog maestro
Pausa: 21 de octubre de 2026 (UTC). Retomar en la próxima sesión.
Repositorio: neowisecostarica-rgb/nexora. App: 69d69fc4304f277844249dd6.
PR vigente: https://github.com/neowisecostarica-rgb/nexora/pull/3
Rama: codex/nexora-mg01-platform-admin.
Head previo a este checkpoint: 5ee3745e5f5924f2eb277aca67a076c5be0f6e12.

## Decisiones que se conservan
- GitHub es fuente de verdad → PR → merge autorizado → publicación autorizada. No integrar ni publicar ahora.
- Gustavo es Super Admin de plataforma; no dueño de una empresa por defecto.
- Consulting administra información de clientes importadores y operaciones expresamente autorizadas; sin acceso financiero global.
- Preservar módulos, datos, contratos, ambos caminos de ventas y comentarios para nuevos desarrolladores.
- Multicategoría, idiomas y monedas requeridos; listas concretas por confirmar. Los valores legacy no equivalen a soporte internacional completo.
- Registros probablemente de prueba según Gustavo; no se confirmó cada fila ni se autorizó limpieza. No borrar ni asignar ownership por suposición.

## Estado verificado
| Bloque | Estado y evidencia |
| --- | --- |
| PR #1 fundamento de permisos | Merge reportado y presente en base |
| PR #2 inventario y preservación | Integrado en main 026740125a5d35a4af88a2190acd8449f00486f4 |
| PR #3 MG01 | Abierto, borrador, sin merge ni publicación |
| Super Admin y administración | Código en PR: empresas, membresías, grants, auditoría, informe legacy |
| Aislamiento | Código en PR: tenantData/bridge, 22 funciones heredadas con contexto, 20 esquemas restringidos |
| Validación local previa | 91 pruebas simuladas; build frontend, lint dirigido, sintaxis backend y diff check aprobados |
| CI verificado | Commit ed8c78fb380bffd6b089b95d11ee248b3aef6e91: Tenant access tests, ejecución 39541331432, success. No afirmar CI del commit documental posterior sin consultarlo |
| Entorno activo | 1 usuario admin (Gustavo), 1 empresa activa, solo rama main. Esquemas nuevos del PR aún no aplicados |
| API/RLS reales | Pendientes; mocks no certifican aislamiento |
| Limpieza/migración | No ejecutada |
| Copia Nexora QA | Solicitada al usuario, todavía sin enlace ni creación confirmada |

## Backlog único, en orden
### MG01 — cerrar seguridad y administración
- [ ] Obtener enlace de Nexora QA o confirmar otro entorno con backend y recursos realmente separados. El conector expuesto no ofrece duplicación ni creación de ramas; crear una app desde prompt no equivale a clonar el candidato.
- [ ] Verificar aislamiento del entorno antes de cargar código; una preview frontend puede compartir datos.
- [ ] Preparar exactamente la versión candidata del PR y comprobar despliegue Deno/RLS. No aplicar el PR a la app original para suplir la falta de QA.
- [ ] Preparar dos identidades de dueño independientes, dos empresas y una identidad de aliado. No falsificar auth.me ni enviar invitaciones sin autorización.
- [ ] Validar CRUD propio/ajeno, acceso SDK directo, sesiones, llamadas backend anidadas y cambio de empresa/cachés.
- [ ] Verificar revocación, vencimiento y suspensión en nuevas peticiones.
- [ ] Verificar privacidad de archivos/URLs, no solo registros.
- [ ] QA de compras, costos, inventario, cotizaciones, ambos caminos de ventas y numeración.
- [ ] Clasificar registros persistidos y respaldar antes de proponer limpieza/migración.
- [ ] Corregir hallazgos y registrar evidencia; solo entonces solicitar revisión para merge y publicación.

### MG02 — operación Consulting e importador
- [ ] Panel de Consulting por cliente y carga autorizada.
- [ ] Estados, hitos, fechas estimadas, tracking y documentos; lectura del importador.
- [ ] Aplicar grants en estos flujos dedicados. Tener un grant no implica que el portal ya exista.
- [ ] Configuración por empresa: países, moneda base y preferencias de idioma/locale.
- [ ] Preservar moneda por documento y costos históricos; no sumar monedas distintas ni simular conversión FX.
- [ ] Extender categorías/atributos para diferentes mercancías preservando claves históricas.

### MG03 — piloto y entrega
- [ ] Demostración completa y coherente para Consulting y un importador.
- [ ] QA móvil/escritorio, recorrido de alta y guía de uso.
- [ ] Definir alcance comercial del piloto y pendientes; no prometer fecha cerrada sin certificar los bloqueos.

## División del próximo paso
Gustavo: compartir el enlace de la copia Nexora QA si la duplica desde Base44; preferir no copiar registros si existe esa opción. No hacer merge/publish.
Especialista: verificar el backend separado, preparar candidato, ejecutar pruebas reales disponibles y documentar límites. No repetir inventario completo ni abrir frentes comerciales antes de resolver MG01.

## Documentación a consultar
AGENTS.md; docs/README.md; docs/NEXORA-BASELINE.md; docs/NEXORA-INVENTORY.md; docs/NEXORA-MG01-ISOLATION.md; docs/NEXORA-MG01-RUNTIME-VERIFICATION.md; docs/NEXORA-TEST-DATA-PLAN.md; docs/NEXORA-REGRESSION-MATRIX.md.
Worktree temporal usado: /tmp/nexora-mg01-platform-admin dentro del sandbox; puede desaparecer. Recuperar desde GitHub, no depender de ese directorio.

## Frase para retomar
“Retomemos Nexora desde docs/NEXORA-CHECKPOINT-BACKLOG.md del PR #3. Prioridad MG01: confirmar Nexora QA con backend separado y probar permisos reales. Preservar lo existente; no hacer merge ni publish.”

Este checkpoint es documental en GitHub. No es un restore point de Base44 ni implica cambios en el runtime. Cron permanece sin reactivar. Trabajo pausado por solicitud del usuario.
