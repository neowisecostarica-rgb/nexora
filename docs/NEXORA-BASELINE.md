# Nexora — línea base que debemos preservar
20 octubre 2026 · commit 54e8532a72a9bd7f51f56cbc993b4b17ac43a93c.
## Método y alcance
Inspección estática del árbol versionado y de referencias SDK; lectura dirigida de contratos críticos. 15 pantallas, 23 entidades, 24 entradas de funciones backend y 11 workflows. Los componentes reutilizables de UI permanecen intactos.
No es una certificación de todas las funciones ni prueba visual/API completa. Estado de activación runtime de workflows desconocido.

## Decisiones del producto
- Gustavo / gustavo.aguilar@gmail.com administra plataforma como Super Admin. NO asignarlo automáticamente como dueño de una empresa. Falta implementar el acceso global seguro y auditado.
- Consulting asesora, coordina/mueve carga y será aliado distribuidor; solo accede a clientes autorizados.
- Sus compradores son clientes importadores. Evitar duplicar un portal de comprador final.
- Multicategoría: ropa/cosméticos/perfumes/tecnología/comida y otras elegidas por cliente. No prometer soporte regulatorio universal.
- Idiomas y monedas múltiples requeridos; ES/EN y CRC/USD/CNY/EUR/MXN fueron propuestas, no una selección final aprobada.
- Piloto en siete días es objetivo condicionado a pruebas; no prueba de preparación comercial.

## Construido y a conservar
| Área | Evidencia | Límite |
|---|---|---|
| Compras | Purchases/PurchaseDetail, PurchaseOrders/PurchaseItems, conversión a unidades | moneda USD/MXN y textos de equipos; generalización pendiente |
| Importación | ImportBatches, datos de transportista, origen/destino, fechas, gastos y estados | aún no tracking multicliente ni expediente completo |
| Inventario | InventoryUnits, atributos JSON, imágenes y estados | flujo principalmente unitario; no afirmar soporte completo de cantidades/lotes |
| Categorías | CategoryConfig: laptops, smartphones, monitors, sneakers | cosméticos/alimentos/perfumes aún sin configurar |
| Catálogo maestro | ProductDefinition/ProductVariant y normalizeCatalog analyze/mirror/link | no reemplazar vista de inventario ni motor financiero |
| Vista comercial | getGroupedCatalogItems deriva grupos de unidades disponibles | preserva stock/precios/imágenes de InventoryUnits |
| Costos | componentes, calculateRealUnitCost, cola y worker | cálculo presente en función y dentro del worker; revisar divergencias |
| Precios | PricingProfiles, overrides unidad/categoría/default, precios retail/mayoreo/mínimo | disparador observa campo antiguo |
| Reservas | crear/cancelar/expirar y conversión a venta | concurrencia/atomicidad sin certificar |
| Pagos | ledger Payments, abonos/parciales/reembolsos/ajustes | acceso por empresa y conciliación pendientes |
| Cotizaciones | Quotes/QuoteItems, snapshot empresarial, numeración, impresión y venta | segundo camino de venta directo desde frontend |
| Ventas | Sales/SaleItems e indicadores | divergencia de campos entre esquema/backend/UI |
| Contactos | Customers/Suppliers | no equivalen a usuarios, tenants o membresías |
| Perfil/documentos | OrganizationProfile, buildOrgSnapshot, secuencias | consultas directas globales sobreviven en UI |
| Acceso | autenticación/protected routes, nuevas membresías/grants y política | no aislamiento completo ni Super Admin terminado |

## Alertas que deben acompañar cualquier modificación
1. QuoteDetail convierte cotización a venta con escrituras directas, usa unit_cost/unit_sale_price/cost_frozen_at_sale; el camino de reservas usa unit_cost_frozen/unit_price_sold. La documentación antigua que dice freeze exclusivamente backend es incompleta.
2. QuoteDetail escribe estado quoted, ausente del enum InventoryUnits revisado. Documentar discrepancia, no certificar rechazo/aceptación runtime sin prueba.
3. Dos implementaciones del cálculo de costos: calculateRealUnitCost y código interno processRecalculationQueue. Consolidación requiere comparación, no borrado.
4. getActiveOrganizationProfile pasó a exigir owner membership en PR1, pero no implementa aún Super Admin. Base de datos no tenía membresías en la consulta anterior; sincronización y acceso actual requieren verificación.
5. Dashboard limita inventario/ventas; Sales contiene campos esperados por UI fuera del esquema revisado.
6. formatCurrency acepta moneda pero usa USD/en-US por defecto; fecha es es-MX. No existe aquí evidencia de conversión FX con historial ni traducción completa. Conservar capacidad actual y ampliarla.
7. Sidebar conserva marca TecnoUsados. Es evidencia del origen, no identidad final de producto.
8. Workflows de costos pueden solaparse; archivo presente no significa scheduler activo. No reactivarlos por documentación.
9. Funciones legacy distributeImportCosts (redirige a cola) y finalizeSaleWithCostFreeze (410) se conservan por compatibilidad.
10. Un comentario no demuestra transacción atómica, seguridad o idempotencia; probar comportamiento.

## Orden siguiente
Corregir contrato Super Admin; inventariar migración de accesos/datos; proteger ambos caminos de ventas y CRUD directo; después extender Consulting/tracking, multicategoría, idiomas/monedas. Antes de publicar, cerrar pruebas API y QA humano.
