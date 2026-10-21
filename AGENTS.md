# Nexora — reglas obligatorias para desarrolladores
Leer docs/README.md, docs/NEXORA-BASELINE.md y docs/NEXORA-INVENTORY.md antes de cambios.
## Preservación
GitHub es fuente de verdad. No borrar, simplificar o reemplazar módulos existentes sin registrar su reemplazo, impacto y pruebas. Mantener contratos, rutas, datos históricos y archivos legacy hasta migración verificada.
No confundir presencia de código con funcionalidad validada. Registrar evidencia como código / prueba local / prueba API / QA humano.
## Roles y alcance aprobados
Gustavo (gustavo.aguilar@gmail.com) es Super Admin de plataforma, NO dueño tenant por defecto. Un admin genérico o un email del navegador no autorizan acceso global. Implementar identidad y permisos en servidor y auditar acceso transversal.
Consulting asesora, coordina carga y distribuye Nexora. Cliente importador es el comprador de ese servicio; no crear un portal separado de comprador final.
Multicategoría, varios idiomas y monedas son requisitos; idiomas/monedas concretos aún por confirmar. No declararlos completos por un formatter o un campo currency.
## Comentarios en archivos
Todo módulo propio de negocio nuevo o modificado debe incluir cabecera con: propósito, datos leídos/escritos, dependencias/llamadas, reglas que protege y límites conocidos. Comentarios dentro de funciones para decisiones no obvias y efectos secundarios; no narrar líneas triviales.
Preservar comentarios previos, pero marcar afirmaciones antiguas que no estén demostradas (por ejemplo atomicidad). Nunca inventar garantías.
JSON/JSONC/workflows: mantener contratos de plataforma; describir en inventario/diccionario sin introducir comentarios incompatibles. Componentes UI de terceros: no reescribir masivamente; documentar adaptaciones propias.
Actualizar docs y matriz de regresiones junto con el código. Toda entidad nueva debe describir campos y ownership.
## Finanzas
Costo oficial total_real_unit_cost; desglose InventoryUnitCostComponents; costo histórico SaleItem.unit_cost_frozen para camino de reservas.
Existen DOS caminos de creación de ventas (reservas y QuoteDetail); revisar ambos. No eliminar el camino de cotizaciones sin reemplazo probado.
Catalog maestro M1 y vista comercial agrupada son conceptos distintos; preservar ambos.
Nunca reactivar cron ni ejecutar migraciones destructivas para hacer QA. No ejecutar merge/publish sin autorización.
## Validación
Cambios documentales: comparar cuerpos byte por byte y comprobar diff. Cambios funcionales: pruebas del contrato afectado y regresiones relevantes. Seguridad: pruebas API con usuarios de empresas distintas y revocación; mocks no certifican aislamiento.
