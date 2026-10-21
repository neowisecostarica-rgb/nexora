# Nexora — matriz de preservación y regresiones
Estado inicial: pendiente de QA runtime. Las 31 pruebas MG01 son unitarias/mocks y NO cubren esta matriz.
| Recorrido | Resultado que preservar/verificar | Evidencia requerida |
|---|---|---|
| Compra → partidas → unidades | cantidades, vínculos y costo base sin duplicados | API + persistencia + reintento |
| Lote + gastos → costo | total concilia con componentes, sin duplicar gastos | caso numérico conocido + ambos motores |
| Perfil → precios | override unidad/categoría/default; sold no cambia | prueba backend |
| Reserva → abonos → venta | estado válido, costo congelado, pago vinculado | API + concurrencia |
| Cancelar/expirar reserva | libera unidad una sola vez, no pisa venta | API + carreras |
| Cotización → impresión → venta | datos históricos, totales, partidas y costo | UI + API + persistencia |
| Dos caminos de ventas | contratos compatibles o migración explícita | prueba comparativa |
| Cambiar perfil empresa | documentos anteriores conservan snapshot | antes/después |
| Catálogo M1 | analyze no escribe; mirror/link no duplican | conteos y datos |
| Vista agrupada | solo available, precios/imágenes correctos | stock comparado |
| Imágenes | principal y lista persisten coherentemente | UI + recarga |
| Dashboard/Ventas | totales completos, monedas identificadas | conciliación sin límites ocultos |
| Super Admin | administración transversal autorizada/auditada | sesión Gustavo + prueba servidor |
| Dos empresas | ID directo y listas no filtran datos ajenos | dos sesiones API reales |
| Consulting | solo cliente/operación autorizados; revocar corta acceso | API + documentos |
| Cliente importador | solo su mercadería/documentos publicados | API + sesión cliente |
| Idiomas | rutas, validaciones y documentos coherentes | QA por idioma elegido |
| Monedas | original/base/tipo cambio/historial; no suma ciega | caso multimoneda |
| Automatizaciones | consumo controlado; no loops ni duplicación | configuración activa + logs |
| Móvil/escritorio | navegación, formularios, retornos e impresión | QA humano |

En cada cambio registrar: base/commit, caso, esperado, observado, prueba, pendientes y responsable. Marcar solo lo ejecutado. No sustituir un fallo real por una prueba que copie el código.

## Evidencia MG01 administrativa
65 pruebas locales con cliente simulado y build aprobados en rama. Alta/revocación/grants/perfil Super Admin cubiertos por contratos simulados. Las filas API/QA humano de esta matriz permanecen pendientes.

Actualización posterior: NEXORA-MG01-ISOLATION.md registra gateway, 22 guardas, RLS en 20 entidades y 91 pruebas locales; runtime/archivos/migración/QA siguen pendientes.
