# Nexora — inventario técnico de preservación

Base auditada: `54e8532a72a9bd7f51f56cbc993b4b17ac43a93c`. Fecha: 20 octubre 2026 (Costa Rica).

Este inventario registra presencia y referencias estáticas; NO certifica comportamiento runtime, seguridad ni estado activo de automatizaciones. Hashes corresponden al código ANTES de añadir las cabeceras de esta entrega. Excluye componentes de UI reutilizables de src/components/ui; permanecen intactos.

## Pantallas

### `src/pages/Catalog.jsx`

Catálogo maestro M1 de ProductDefinition/ProductVariant y herramientas de normalización.

- Operaciones SDK detectadas: `ProductDefinition.list`, `ProductVariant.list`.
- Funciones invocadas: `normalizeCatalog`.
- Líneas: 249; SHA-256 original: `3ac91ef4fabeca38703d1baca04022794930bc08af4fb8a47488e3e67681b049`.

### `src/pages/Customers.jsx`

Alta, consulta y actualización de contactos comerciales; no equivale a cuentas tenant.

- Operaciones SDK detectadas: `Customers.create`, `Customers.list`, `Customers.update`.
- Líneas: 138; SHA-256 original: `1abf96c398578a0f656437ab6e302b1e16e0ad03c569d6a218aa7d63bea659e2`.

### `src/pages/Dashboard.jsx`

Panel de inventario, compras, ventas y utilidad potencial; sus límites de consulta no equivalen a totales completos.

- Operaciones SDK detectadas: `InventoryUnits.list`, `PurchaseOrders.list`, `Sales.list`.
- Líneas: 172; SHA-256 original: `9ffc771b5c9d560233e5bdcaa3f21d95efa487b8c5becc33caeb26e2d18b5212`.

### `src/pages/Expenses.jsx`

Registro y consulta de gastos que pueden alimentar el motor de costos.

- Operaciones SDK detectadas: `Expenses.create`, `Expenses.list`.
- Líneas: 103; SHA-256 original: `5246e36e9f0857b84ab0fc6b62edee2453ef756ed7a6e2d7f4b3539a7b2ebcaa`.

### `src/pages/ImportBatches.jsx`

Alta y edición de lotes de importación y gastos agregados; no representa todavía un portal de tracking.

- Operaciones SDK detectadas: `ImportBatches.create`, `ImportBatches.list`, `ImportBatches.update`.
- Líneas: 146; SHA-256 original: `e5dd1ea9e7ab83da8212656b5d131263a31c2d5f05a2ddfc378750da362cd83a`.

### `src/pages/Inventory.jsx`

Consulta y edición de unidades e imágenes, estado y perfiles de precios.

- Operaciones SDK detectadas: `InventoryUnits.list`, `InventoryUnits.update`, `PricingProfiles.filter`.
- Líneas: 259; SHA-256 original: `85910e16b40e7bf31b15f29d63433ec819764d7de7a793d7aef13e1c7484bab6`.

### `src/pages/OAuthConsent.jsx`

Pantalla de consentimiento de acceso OAuth; preservar el contrato de autorización.

- Líneas: 239; SHA-256 original: `010ab0d83bb6b84c371b7895c99b8ae6fa21b06253c4a705bf3edea4d18d030a`.

### `src/pages/PricingEngine.jsx`

Configuración de perfiles y solicitud de cálculo backend de precios.

- Operaciones SDK detectadas: `InventoryUnits.list`, `PricingProfiles.create`, `PricingProfiles.list`, `PricingProfiles.update`.
- Funciones invocadas: `calculateAndCachePricing`.
- Líneas: 258; SHA-256 original: `86277304a80bde8c82c5c79dd196ead21f30cf6c275a82426af084c78fc0863b`.

### `src/pages/PurchaseDetail.jsx`

Detalle de compra, partidas y conversión de partidas en unidades de inventario.

- Operaciones SDK detectadas: `PurchaseItems.create`, `PurchaseItems.filter`, `PurchaseOrders.filter`, `PurchaseOrders.update`.
- Funciones invocadas: `createInventoryFromPurchaseItem`.
- Líneas: 225; SHA-256 original: `f06f06d695ebbd006c2d7abc5d962a3ba3189cee100442d8a0f385705fd7e18a`.

### `src/pages/Purchases.jsx`

Listado y alta de órdenes de compra; conserva moneda, proveedor y asociación con importación.

- Operaciones SDK detectadas: `PurchaseOrders.create`, `PurchaseOrders.list`.
- Líneas: 189; SHA-256 original: `37afe969cd627841aecfe37e094468be9c7b6463a1205ab7d055ac274ff7a3de`.

### `src/pages/QuoteDetail.jsx`

Partidas de cotización, impresión y conversión directa en venta desde UI. Este camino también debe protegerse.

- Operaciones SDK detectadas: `InventoryUnits.filter`, `InventoryUnits.update`, `OrganizationProfile.filter`, `QuoteItems.create`, `QuoteItems.filter`, `Quotes.filter`, `Quotes.update`, `SaleItems.create`, `Sales.create`.
- Funciones invocadas: `generateDocumentNumber`.
- Líneas: 329; SHA-256 original: `4a4f07e4658849a54f22c238ca882a1e12b290f6b1d8e98feee9a5af9113bfab`.

### `src/pages/Quotes.jsx`

Listado y alta de cotizaciones con numeración y datos históricos de empresa.

- Operaciones SDK detectadas: `Customers.list`, `OrganizationProfile.filter`, `Quotes.create`, `Quotes.list`.
- Funciones invocadas: `generateDocumentNumber`.
- Líneas: 203; SHA-256 original: `293901678ad3c525599f19cb90ea3f8e67c83d9cce73eb0eb13d0120280837ef`.

### `src/pages/Sales.jsx`

Historial, actualización y métricas de ventas; reconciliar campos con ambos caminos de creación.

- Operaciones SDK detectadas: `Sales.list`, `Sales.update`.
- Líneas: 183; SHA-256 original: `e4b7a0d45a2dffdb188705f376d560999b80c43e845d606ee4b4963947e10434`.

### `src/pages/Settings.jsx`

Edición de perfil de empresa y configuración de documentos. No es aún administración global Super Admin.

- Operaciones SDK detectadas: `OrganizationProfile.create`, `OrganizationProfile.filter`, `OrganizationProfile.update`.
- Líneas: 340; SHA-256 original: `ea0e144c57e9f8d68720809787e8caf35aafa1c01810f1c1be7c920202650c8e`.

### `src/pages/Suppliers.jsx`

Alta, consulta y actualización de proveedores.

- Operaciones SDK detectadas: `Suppliers.create`, `Suppliers.list`, `Suppliers.update`.
- Líneas: 156; SHA-256 original: `51a3047b84fee0d5fb15808c03b208cc6182be8c93c8b37ddf598fe43c3fa727`.

## Funciones y handlers

### `base44/functions/calculateAndCachePricing/entry.ts`

calculateAndCachePricing Motor de precios central. Resuelve el PricingProfile correcto para una unidad y calcula + guarda los precios en InventoryUnits.

- Operaciones SDK detectadas: `InventoryUnits.get`, `InventoryUnits.update`, `PricingProfiles.filter`, `PricingProfiles.get`.
- Líneas: 165; SHA-256 original: `346d66beb5f128bf2f6bcb61ff27fd3ee9363f30cbd35fdabc43d045fca70ac6`.

### `base44/functions/calculateRealUnitCost/entry.ts`

Calcula costo real y reconstruye componentes; escribe total_real_unit_cost.

- Operaciones SDK detectadas: `Expenses.filter`, `ImportBatches.get`, `InventoryUnitCostComponents.create`, `InventoryUnitCostComponents.delete`, `InventoryUnitCostComponents.filter`, `InventoryUnits.filter`, `InventoryUnits.get`, `InventoryUnits.update`.
- Líneas: 366; SHA-256 original: `90195f72e652250ebaa71aeda9fc4fe32b291afa961bbacf8d498cdcb474fb97`.

### `base44/functions/cancelReservation/entry.ts`

cancelReservation Cancela una reserva activa y libera la unidad de inventario. INPUT: { reservation_id }

- Operaciones SDK detectadas: `InventoryUnits.update`, `Reservations.get`, `Reservations.update`.
- Líneas: 55; SHA-256 original: `209c772da02cf6ef3c357522911c54caff24447f3bd8c94ee1690272a44faf9c`.

### `base44/functions/cleanupConversionLocks/entry.ts`

cleanupConversionLocks Limpia locks de conversión huérfanos (conversion_in_progress = true por más de 10 min). Invocado por automatización programada cada 15 minutos.

- Operaciones SDK detectadas: `PurchaseItems.filter`, `PurchaseItems.update`.
- Líneas: 43; SHA-256 original: `71773a5ab42f28d42d8eeb37bfae9e8c006d14e5468d81883d0f06f1190a365c`.

### `base44/functions/convertReservationToSale/entry.ts`

convertReservationToSale Convierte una reserva activa en una venta real con histórico congelado. REGLAS CRÍTICAS:

- Operaciones SDK detectadas: `InventoryUnits.get`, `InventoryUnits.update`, `Reservations.get`, `Reservations.update`, `SaleItems.create`, `SaleItems.filter`, `Sales.create`.
- Líneas: 145; SHA-256 original: `f59f1126915aebfe1c92df44b9064d0b1935abc0642a7fdb8c82929571a6a39b`.

### `base44/functions/createInventoryFromPurchaseItem/entry.ts`

createInventoryFromPurchaseItem Genera InventoryUnits desde un PurchaseItem. Schema v1.0 — 100% compatible con CategoryConfig y PricingEngine.

- Operaciones SDK detectadas: `InventoryUnits.create`, `PurchaseItems.get`, `PurchaseItems.update`.
- Líneas: 156; SHA-256 original: `d63166c69e9fdd8903ddc889007908b33a3aeab58ffd9eb9f15e2eea6e9882db`.

### `base44/functions/createPayment/entry.ts`

createPayment Registra un pago real en el ledger financiero. REGLAS CRÍTICAS:

- Operaciones SDK detectadas: `Payments.create`, `Reservations.get`, `Sales.get`.
- Líneas: 116; SHA-256 original: `0b825d7bf6ba8db39e116e4f280a79bd30d6571832460e5559737462295200d8`.

### `base44/functions/createReservation/entry.ts`

createReservation Crea una reserva y bloquea el inventario. REGLA CRÍTICA: solo permite reservar si InventoryUnits.status === "available"

- Operaciones SDK detectadas: `InventoryUnits.get`, `InventoryUnits.update`, `Reservations.create`.
- Líneas: 79; SHA-256 original: `0b059ac0584e8bd7921a78443079a6f0ba22d6fdf49e22039c6073d337ebdd22`.

### `base44/functions/distributeImportCosts/entry.ts`

distributeImportCosts ⚠️  LEGACY — DEPRECATED ════════════════════════════════════════════════════════════════════════════

- Operaciones SDK detectadas: `ImportBatches.get`, `InventoryUnits.filter`.
- Funciones invocadas: `enqueueRecalculation`.
- Líneas: 94; SHA-256 original: `6431f5533b0afc5802d9e8effa37dfc532bbce6927205fbe1e8c45ad8e1d9798`.

### `base44/functions/enqueueRecalculation/entry.ts`

Encola o actualiza trabajo de recálculo por unidad; preservar deduplicación y trazabilidad.

- Operaciones SDK detectadas: `InventoryUnits.get`, `RecalculationQueue.create`, `RecalculationQueue.filter`, `RecalculationQueue.update`.
- Líneas: 192; SHA-256 original: `5a56ba71402c0df42bf3b9d8ea5e6ebb530d2e457323a333a8d24dbf8835871d`.

### `base44/functions/expireReservations/entry.ts`

expireReservations CRON JOB: busca reservas activas cuyo expires_at < now y las expira, liberando las unidades de inventario correspondientes.

- Operaciones SDK detectadas: `InventoryUnits.update`, `Reservations.filter`, `Reservations.update`.
- Líneas: 53; SHA-256 original: `db0e53509c607366889cd61fdfe695034af903b6c2c63220862b4281e120ebfa`.

### `base44/functions/finalizeSaleWithCostFreeze/entry.ts`

finalizeSaleWithCostFreeze — ARCHIVADA / ZOMBIE ESTA FUNCIÓN ESTÁ DESACTIVADA Y NO DEBE INVOCARSE. El freeze de costo ocurre EXCLUSIVAMENTE en convertReservationToSale

- Líneas: 19; SHA-256 original: `94c57181a6161d6737655b051f78b926de8dab89331c6bbd4434e0343e9a3e3c`.

### `base44/functions/generateDocumentNumber/entry.ts`

Obtiene y actualiza secuencias del perfil empresarial; revisar concurrencia y ámbito antes de certificar.

- Operaciones SDK detectadas: `OrganizationProfile.filter`, `OrganizationProfile.update`.
- Líneas: 48; SHA-256 original: `a38c62403c0af68354365530d3998f2c59b437d05c8bc6e9e25da91ccb19261d`.

### `base44/functions/getActiveOrganizationProfile/entry.ts`

Entrada HTTP del perfil empresarial. El cambio MG01 exige membresía owner y aún requiere Super Admin y migración.

- Líneas: 24; SHA-256 original: `3345cde2753a8bda7f1bb4e5924980f673abe2324084f2e52000f8769e749a0a`.

### `base44/functions/getActiveOrganizationProfile/handler.mjs`

Resolve company profile from authenticated identity and server memberships. Organization IDs are OrganizationProfile record IDs. No global active-profile fallback. Legacy users without memberships fail closed until migration is completed.

- Operaciones SDK detectadas: `OrganizationMembership.filter`, `OrganizationProfile.filter`.
- Líneas: 25; SHA-256 original: `44fe04d50f44723df14ce53e213d60e6eb18078bdb236b6ad32210262e02d46a`.

### `base44/functions/getGroupedCatalogItems/entry.ts`

getGroupedCatalogItems Vista comercial del catálogo — derivada EXCLUSIVAMENTE de InventoryUnits. REGLAS CRÍTICAS:

- Operaciones SDK detectadas: `InventoryUnits.filter`.
- Líneas: 163; SHA-256 original: `0cbc294504a57e5374622e7b8ff23f5c3de5a86b0390e9376fca84a3d7d1ae28`.

### `base44/functions/manageInventoryImages/entry.ts`

Gestiona imágenes de la unidad de inventario.

- Operaciones SDK detectadas: `InventoryUnits.get`, `InventoryUnits.update`.
- Líneas: 51; SHA-256 original: `cd7558632f7bff9193a29c56a02cfdd5b12c81e6613efbda591b75e8fcb01478`.

### `base44/functions/normalizeCatalog/entry.ts`

normalizeCatalog Utilería idempotente para análisis y espejo del catálogo M1. MODOS:

- Operaciones SDK detectadas: `InventoryUnits.list`, `InventoryUnits.update`, `ProductDefinition.create`, `ProductDefinition.list`, `PurchaseItems.list`, `PurchaseItems.update`.
- Líneas: 239; SHA-256 original: `8a51da3ccaa6492b055751f58bc69b31824bfdaed95efa0442a6b3cf56e14ff2`.

### `base44/functions/normalizeInventoryUnit/entry.ts`

normalizeInventoryUnit Función backend que genera normalized_display_name para un InventoryUnit usando CategoryConfig + buildDisplayName.

- Operaciones SDK detectadas: `InventoryUnits.get`, `InventoryUnits.update`.
- Líneas: 92; SHA-256 original: `2799d129cc7cd1f32742defef6a62526d3cb861fcd0e6aafe2b17f51686aec74`.

### `base44/functions/onExpenseChanged/entry.ts`

Traduce cambios de gastos en solicitudes de recálculo para unidades afectadas.

- Operaciones SDK detectadas: `Expenses.get`, `InventoryUnits.filter`.
- Funciones invocadas: `enqueueRecalculation`.
- Líneas: 163; SHA-256 original: `b47f2f83b44ca6abfc671fc59de00b08bcce94583bd2bc4b449156ceaa059b21`.

### `base44/functions/onImportBatchChanged/entry.ts`

Traduce cambios del lote de importación en solicitudes de recálculo.

- Operaciones SDK detectadas: `InventoryUnits.filter`.
- Funciones invocadas: `enqueueRecalculation`.
- Líneas: 83; SHA-256 original: `e5d2e19396236aead88cafb9da75f75d6f1c05431c45a6df064f841b23d87fdc`.

### `base44/functions/onInventoryUnitChanged/entry.ts`

Traduce cambios de unidad en solicitudes de recálculo.

- Funciones invocadas: `enqueueRecalculation`.
- Líneas: 47; SHA-256 original: `7a12b13b4a54c91acac7ab296c3a30f934d40106e71e185df489a617f63ef8e6`.

### `base44/functions/processRecalculationQueue/entry.ts`

Procesa cola de recálculo y contiene cálculo de costos interno. Comparar ambos motores antes de consolidarlos.

- Operaciones SDK detectadas: `Expenses.filter`, `ImportBatches.get`, `InventoryUnitCostComponents.create`, `InventoryUnitCostComponents.delete`, `InventoryUnitCostComponents.filter`, `InventoryUnits.filter`, `InventoryUnits.get`, `InventoryUnits.update`, `RecalculationQueue.filter`, `RecalculationQueue.update`.
- Líneas: 371; SHA-256 original: `c23a1ff9e1fc9a8a75b6ab1d1516eb584385ff84a3e4fe9ba60a5917d117eda1`.

### `base44/functions/recalculatePricesForProfile/entry.ts`

recalculatePricesForProfile Automation handler: se dispara cuando se actualiza un PricingProfile. Recalcula precios en batch para todas las unidades que usan ese perfil

- Operaciones SDK detectadas: `InventoryUnits.filter`.
- Funciones invocadas: `calculateAndCachePricing`.
- Líneas: 78; SHA-256 original: `6701c34a97331aff44d3cd2f928b24f9a239680aef74283039b21c4973a302a9`.

### `base44/functions/recalculatePricingOnCostChange/entry.ts`

recalculatePricingOnCostChange Automation handler: se dispara cuando cambia real_unit_cost o assigned_pricing_profile_id en InventoryUnits.

- Funciones invocadas: `calculateAndCachePricing`.
- Líneas: 31; SHA-256 original: `f2e9f686bf1da15813aa209d9cc1981436dfdbf5f201895f6dcacf1e7305996a`.

## Entidades

### `base44/entities/CostComponentDefinitions.jsonc`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Campos: `organization_id`, `key`, `label`, `description`, `is_active`.
- Líneas: 33; SHA-256 original: `17b90c1b4457c40401bd34eb462a6f835eeb5c7079339dd40ed7a0bcb04dc62f`.

### `base44/entities/Customers.jsonc`

Alta, consulta y actualización de contactos comerciales; no equivale a cuentas tenant.

- Campos: `customer_type`, `full_name`, `company_name`, `tax_id`, `phone`, `email`, `address`, `city`, `notes`, `preferred_channel`.
- Líneas: 50; SHA-256 original: `25377798a7a79e1a59ae6fcfa33558353af85cc402c99385a9889fae00fd2fe5`.

### `base44/entities/Expenses.jsonc`

Registro y consulta de gastos que pueden alimentar el motor de costos.

- Campos: `date`, `category`, `allocation_category`, `linked_entity_type`, `linked_entity_id`, `amount`, `notes`.
- Líneas: 49; SHA-256 original: `25f0f63efc8430e652d7e9c1a57e3f366237b76b0fd43f03e4c3d1a583e3e54f`.

### `base44/entities/ImportBatches.jsonc`

Alta y edición de lotes de importación y gastos agregados; no representa todavía un portal de tracking.

- Campos: `batch_code`, `courier`, `origin_country`, `destination_country`, `ship_date`, `arrival_date`, `customs_total`, `freight_total`, `local_transport_total`, `per_unit_import_default`, `extra_cost_total`, `total_units`, `notes`, `status`.
- Líneas: 69; SHA-256 original: `c10b6657f0d8002c0a76f435040a560553fc6b1df78ff971c886cd0a5f261c3b`.

### `base44/entities/InventoryUnitCostComponents.jsonc`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Campos: `organization_id`, `inventory_unit_id`, `cost_component_key`, `amount`, `metadata`.
- Líneas: 48; SHA-256 original: `1a1f3c5045398a5bc835b32efb2d1c30c3d739892e2c9a4103fad46abfd5443e`.

### `base44/entities/InventoryUnits.jsonc`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Campos: `organization_id`, `purchase_item_id`, `import_batch_id`, `category_key`, `status`, `condition`, `location`, `attributes`, `normalized_display_name`, `images`, `main_image`, `legacy_real_unit_cost`, `cost_purchase_unit`, `allocated_import_cost`, `allocated_tax_cost`, `allocated_local_cost`, `allocated_repair_cost`, `allocated_other_cost`, `total_real_unit_cost`, `assigned_pricing_profile_id`, `retail_price`, `wholesale_price`, `minimum_price`, `margin_percent`, `product_definition_id`, `product_variant_id`.
- Líneas: 138; SHA-256 original: `b4d126a62735b9dc8995df9d842bd1fa1c9894555e5c4903054789d9c53232c6`.

### `base44/entities/OrganizationMembership.jsonc`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Campos: `organization_id`, `user_id`, `role`, `status`, `expires_at`.
- Líneas: 57; SHA-256 original: `4b6cdc689cbc5336ce5f1bdfe1d940d839b1a67506fd6edbe74bf90a1317d9f3`.

### `base44/entities/OrganizationProfile.jsonc`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Campos: `legal_name`, `commercial_name`, `brand_name`, `legal_id`, `logo_url`, `phone_main`, `phone_secondary`, `email_main`, `website`, `address_line`, `city`, `country`, `payment_instructions`, `bank_details`, `sinpe_details`, `default_quote_notes`, `default_sale_notes`, `default_terms_conditions`, `quote_validity_days`, `document_prefix_quote`, `document_prefix_sale`, `next_quote_number_sequence`, `next_sale_number_sequence`, `show_logo_on_documents`, `show_bank_details_on_quotes`, `show_terms_on_quotes`, `invoice_external_system_note`, `active`.
- Líneas: 105; SHA-256 original: `253700d6c55e8b76d637f032a52805a0b95c9b68fb7bc1c08f6b3fdd8a5f0f3b`.

### `base44/entities/PartnerAccessGrant.jsonc`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Campos: `partner_organization_id`, `client_organization_id`, `status`, `permissions`, `operation_ids`, `expires_at`.
- Líneas: 72; SHA-256 original: `aa1a90863f63faa9cd39452c88ab1dab998b3836e0d57a639e3947ddd0272472`.

### `base44/entities/Payments.jsonc`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Campos: `amount`, `currency`, `payment_method`, `payment_date`, `payment_type`, `status`, `reference`, `notes`, `customer_name`, `reservation_id`, `sale_id`.
- Líneas: 83; SHA-256 original: `6bb48a5eca7573024cb062850c15db0c1e0c04ee11b2551177035118de1f0027`.

### `base44/entities/PricingProfiles.jsonc`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Campos: `name`, `scope_type`, `category_key`, `margin_retail`, `margin_wholesale`, `margin_minimum`, `rounding_rule`, `is_default`, `is_active`.
- Líneas: 70; SHA-256 original: `92864aa636a5752968aae8d541d689b5ee1955944e8ae67c3db94210916cdd62`.

### `base44/entities/ProductDefinition.jsonc`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Campos: `brand`, `model`, `category_key`, `product_family_code`, `identity_hash`, `is_active`, `notes`.
- Líneas: 41; SHA-256 original: `816fd161de10f44239dc25e43aaa8f8fc8d33b22f1db157dd212896899030e5f`.

### `base44/entities/ProductVariant.jsonc`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Campos: `product_definition_id`, `sku`, `variant_hash`, `attributes`, `base_cost_override`, `is_active`, `notes`.
- Líneas: 41; SHA-256 original: `2377d25610fb24f7b6a6b7d006fea8265843097d02a636865f37e099476c681e`.

### `base44/entities/PurchaseItems.jsonc`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Campos: `purchase_order_id`, `brand`, `model`, `line_family`, `cpu`, `ram_gb`, `storage_type`, `storage_gb`, `screen_size`, `screen_type`, `form_factor`, `condition_grade`, `quantity`, `item_subtotal`, `allocated_order_total`, `estimated_unit_cost_from_order_total`, `inventory_generated_count`, `conversion_in_progress`, `notes`, `product_definition_id`, `product_variant_id`.
- Líneas: 106; SHA-256 original: `0ca69b9761668874b05f57863cf2bac27c98068f44a79e451ae41d4f3ebbfd33`.

### `base44/entities/PurchaseOrders.jsonc`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Campos: `purchase_code`, `supplier_id`, `source_platform`, `order_number`, `purchase_date`, `currency`, `items_subtotal`, `usa_shipping_total`, `usa_tax_total`, `discounts_total`, `order_total_paid`, `total_units`, `import_batch_id`, `status`, `notes`, `attachments`.
- Líneas: 90; SHA-256 original: `07cbdeeb5a5310536f226518bcab4ef6bc4f5c5f9ab53cb087fa0491d379e33b`.

### `base44/entities/QuoteItems.jsonc`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Campos: `quote_id`, `inventory_unit_id`, `description`, `quantity`, `unit_price`, `discount`, `line_total`.
- Líneas: 37; SHA-256 original: `d39cfc942acfe4b25d46ed2faedceff6eb320de367d9942b6068e134786e95f6`.

### `base44/entities/Quotes.jsonc`

Listado y alta de cotizaciones con numeración y datos históricos de empresa.

- Campos: `quote_number`, `customer_id`, `customer_name`, `quote_date`, `valid_until`, `sales_channel`, `status`, `subtotal`, `discount_total`, `tax_total`, `total`, `notes`, `terms_conditions_snapshot`, `organization_profile_snapshot`.
- Líneas: 114; SHA-256 original: `ddf8dfe2e822cfd86e96f2bae85a8f9971faedae163d3911e4dab8d2ab737787`.

### `base44/entities/RecalculationQueue.jsonc`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Campos: `organization_id`, `inventory_unit_id`, `trigger_source`, `trigger_entity_type`, `trigger_entity_id`, `status`, `dedupe_key`, `scheduled_for`, `processed_at`, `error_message`, `metadata`.
- Líneas: 68; SHA-256 original: `a5f0bc218ea78aafc0556ee01658794fa5b078603c1062c054cd294ea20a0777`.

### `base44/entities/Reservations.jsonc`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Campos: `inventory_unit_id`, `customer_name`, `customer_phone`, `customer_email`, `status`, `reserved_at`, `expires_at`, `required_deposit`, `notes`, `sale_id`.
- Líneas: 62; SHA-256 original: `c399f2fcb4e51081a1a50ba2712cc2b757d9ab9d909dfef4bdd5efa3e9a1c4fe`.

### `base44/entities/SaleItems.jsonc`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Campos: `sale_id`, `inventory_unit_id`, `quantity`, `unit_price_sold`, `unit_cost_frozen`, `line_total`, `profit_amount`.
- Líneas: 46; SHA-256 original: `ee7586d55129d0c51cee47773f35fad4093116c024286a9087db3a73fc1e7432`.

### `base44/entities/Sales.jsonc`

Historial, actualización y métricas de ventas; reconciliar campos con ambos caminos de creación.

- Campos: `customer_name`, `customer_phone`, `customer_email`, `channel`, `subtotal`, `discount_total`, `tax_total`, `total`, `notes`.
- Líneas: 58; SHA-256 original: `d6329766a7f75be1cd421a459e89797ca0a6e636b42b38e5c8f6c491733f49c8`.

### `base44/entities/Suppliers.jsonc`

Alta, consulta y actualización de proveedores.

- Campos: `name`, `source_type`, `contact_name`, `phone`, `email`, `country`, `notes`, `is_active`.
- Líneas: 43; SHA-256 original: `bcaa6853cd81f684f1dade30f6588fa4740455c26b5d060632602ce737a52e04`.

### `base44/entities/User.jsonc`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Campos: `role`.
- Líneas: 17; SHA-256 original: `4de38108e89f3bb0c1c7411eabdd47f8899238f1580428a167de47b10c5b3a31`.

## Automatizaciones

### `base44/workflows/Cost Engine — Enqueue on ImportBatch Change.jsonc`

Encola recálculo para todas las InventoryUnits del batch cuando un ImportBatch cambia. NO recalcula directamente — solo llama enqueueRecalculation para cada unidad afectada.

- Disparador: `{"condition":null,"config":{"trigger_type":"entity","events":["create","update"],"entity_name":"ImportBatches"}}`.
- SHA-256 original: `1590a92d00c1d95270d7bcd7e77aa3311d9db87435cfd6513115351384d9d1dd`.

### `base44/workflows/Expire Reservations CRON.jsonc`

Verifica cada 15 minutos si hay reservas activas cuyo expires_at ya pasó y las expira, liberando las unidades de inventario.

- Disparador: `{"condition":null,"config":{"trigger_type":"scheduled","events":[],"schedule_mode":"interval","cron_expression":null,"one_time_date":null,"timezone":"UTC","interval_value":15,"interval_unit":"minutes","interval_anchor":"2026-04-14T17:24:36.367000","ends_type":"never","ends_on_date":null,"ends_after_count":null}}`.
- SHA-256 original: `a20c7f1f28e9dd353e50d928b1cd373a88e66cd86ff31ad04596b32bdfb22d87`.

### `base44/workflows/Cost Engine — Worker processRecalculationQueue.jsonc`

Worker central que procesa hasta 10 registros pendientes de RecalculationQueue por ejecución. Invoca calculateRealUnitCost para cada unidad elegible.

- Disparador: `{"condition":null,"config":{"trigger_type":"scheduled","events":[],"schedule_mode":"interval","cron_expression":null,"one_time_date":null,"timezone":"UTC","interval_value":5,"interval_unit":"minutes","interval_anchor":"2026-04-21T03:58:08.423000","ends_type":"never","ends_on_date":null,"ends_after_count":null}}`.
- SHA-256 original: `6197e02a861434860eafd634664cefe4c8301e4f0e6b876dd3ff4d06e9d76738`.

### `base44/workflows/Normalize InventoryUnit Display Name.jsonc`

Genera normalized_display_name automáticamente usando CategoryConfig + buildDisplayName cada vez que se crea o actualiza un InventoryUnit.

- Disparador: `{"condition":"${ (.trigger.changed_fields | index(\"normalized_display_name\") == null) }","config":{"trigger_type":"entity","events":["create","update"],"entity_name":"InventoryUnits"}}`.
- SHA-256 original: `717d6fa51777cf6b135302285063f6c9b1dc15d5c169f0d553f0ac747c618565`.

### `base44/workflows/Cost Engine — Enqueue on Expense Change.jsonc`

Encola recálculo para la(s) InventoryUnit(s) afectadas cuando un Expense cambia. Cubre linked_entity_type=InventoryUnits e ImportBatches. PurchaseItems pendiente para siguiente bloque.

- Disparador: `{"condition":null,"config":{"trigger_type":"entity","events":["create","update"],"entity_name":"Expenses"}}`.
- SHA-256 original: `0000fbe95e4497eaa5e18526dc8f60e0d71c71ebcd0d1bcfb85fc74776928539`.

### `base44/workflows/Inventario: Validar imágenes al actualizar.jsonc`

Disparador y función definidos en este archivo; ejecución real pendiente de validación.

- Disparador: `{"condition":"${ ((.trigger.changed_fields | index(\"images\") != null) or (.trigger.changed_fields | index(\"main_image\") != null)) }","config":{"trigger_type":"entity","events":["update"],"entity_name":"InventoryUnits"}}`.
- SHA-256 original: `feff23e8a0f3b2664f0a23c2723d77ace4a5b2149da29219b105be96773b9b4a`.

### `base44/workflows/Limpiar locks de conversión huérfanos.jsonc`

Disparador y función definidos en este archivo; ejecución real pendiente de validación.

- Disparador: `{"condition":null,"config":{"trigger_type":"scheduled","events":[],"schedule_mode":"interval","cron_expression":null,"one_time_date":null,"timezone":"UTC","interval_value":15,"interval_unit":"minutes","interval_anchor":"2026-04-09T00:17:43.207000","ends_type":"never","ends_on_date":null,"ends_after_count":null}}`.
- SHA-256 original: `a6675deb483c752f236a60b80ab4e2a6f48db712cd540594cdfbf0a916c860a3`.

### `base44/workflows/Pricing: Recalcular masivo al actualizar perfil.jsonc`

Disparador y función definidos en este archivo; ejecución real pendiente de validación.

- Disparador: `{"condition":null,"config":{"trigger_type":"entity","events":["update"],"entity_name":"PricingProfiles"}}`.
- SHA-256 original: `fc436483b0cd4e7a8f23e86bdb31355032fff12d5788c8b591fa6ccc3eeb2d27`.

### `base44/workflows/ImportBatch: Distribuir costos al actualizar.jsonc`

Disparador y función definidos en este archivo; ejecución real pendiente de validación.

- Disparador: `{"condition":"${ ((.trigger.changed_fields | index(\"customs_total\") != null) or (.trigger.changed_fields | index(\"freight_total\") != null) or (.trigger.changed_fields | index(\"local_transport_total\") != null) or (.trigger.changed_fields | index(\"extra_cost_total\") != null)) }","config":{"trigger_type":"entity","events":["update"],"entity_name":"ImportBatches"}}`.
- SHA-256 original: `5cae56998f340738f24f0675fcf8ae6091040def87e0421ed8fb0a8b392372b0`.

### `base44/workflows/Cost Engine — Enqueue on InventoryUnit Change.jsonc`

Encola recálculo de costo cuando una InventoryUnit es creada o modificada. NO recalcula directamente — solo llama enqueueRecalculation.

- Disparador: `{"condition":null,"config":{"trigger_type":"entity","events":["create","update"],"entity_name":"InventoryUnits"}}`.
- SHA-256 original: `4e20b93c954b92b7e7befec60fd50a922327f43261eca57b83075e815a1bb885`.

### `base44/workflows/Recalcular Pricing al Cambiar Costo Real.jsonc`

Automation obligatoria: cuando cambia cualquier campo de costo real en InventoryUnits, recalcula automáticamente los precios via calculateAndCachePricing para mantener SOT.

- Disparador: `{"condition":"${ ((.trigger.changed_fields | index(\"real_unit_cost\") != null) or (.trigger.changed_fields | index(\"assigned_pricing_profile_id\") != null)) }","config":{"trigger_type":"entity","events":["update"],"entity_name":"InventoryUnits"}}`.
- SHA-256 original: `887cbe88b72bbc6414fa8fa162aa2c9119ac1fdff09b1c858ec9d8eb7408471f`.

## Utilidades y contexto

### `src/lib/AuthContext.jsx`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Líneas: 154; SHA-256 original: `3783983e43151c9a1f42d4fe4a51fbb33e9b907db19ad82d493c7db8ad3d1843`.

### `src/lib/PageNotFound.jsx`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Líneas: 75; SHA-256 original: `8536e2091188275762a6729ecd77a77b8c5f1187525ae4189df42c95ca42f196`.

### `src/lib/app-params.js`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Líneas: 54; SHA-256 original: `d0c8c149528b705355dbc842096b6662df4610eba1f356285fee74211fc580d3`.

### `src/lib/categoryConfig.js`

CATEGORY CONFIG — Fuente única de verdad para configuración de categorías. Para agregar una categoría nueva: solo agregar una entrada aquí. NO duplicar esta lógica en ningún otro lugar.

- Líneas: 43; SHA-256 original: `c9f55f910a82fb442893819bf0be42e1c96161051dbdae8c88d263f41533045c`.

### `src/lib/formatters.js`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Líneas: 36; SHA-256 original: `59dd30c8ce9c230bfacc5c48210c6776aaddce8e74d275f597bbc9147a99f6ff`.

### `src/lib/orgProfileSnapshot.js`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Líneas: 39; SHA-256 original: `d09549b0a1e4edf342b500d2b60757ee443ddf44b4c1a6a04b40da9425db05d4`.

### `src/lib/query-client.js`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Líneas: 11; SHA-256 original: `0a080b6d9a1ed9f5f32150d9e3faa928f955d2b8d6206831e2b1658e84612c92`.

### `src/lib/utils.js`

Archivo presente; consultar implementación y referencias siguientes. No inferir madurez por su existencia.

- Líneas: 9; SHA-256 original: `4f592359765d69c32c3617700fa111af9a6a9cac8f18cb1987c25503a343c203`.

