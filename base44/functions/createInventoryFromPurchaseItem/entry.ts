/**
 * createInventoryFromPurchaseItem
 *
 * Genera InventoryUnits desde un PurchaseItem.
 * Schema v1.0 — 100% compatible con CategoryConfig y PricingEngine.
 *
 * MODELO DE DATOS (SOT v2):
 * - category_key: clave de categoría (ej. "laptops")
 * - attributes: JSON con todos los atributos del producto (brand, model, cpu, etc.)
 * - cost_purchase_unit: costo base de compra por unidad (SOT)
 * - total_real_unit_cost: inicializado igual a cost_purchase_unit (SOT activo)
 * - status: "available"
 *
 * NO escribe real_unit_cost ni campos legacy allocated_*
 * El motor de costos (calculateRealUnitCost) actualizará total_real_unit_cost
 * cuando se asignen costos de importación y gastos adicionales.
 *
 * INPUT: { purchaseItemId, importBatchId?, category_key, unitsData? }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { purchaseItemId, importBatchId, category_key, unitsData } = await req.json();

  if (!purchaseItemId) {
    return Response.json({ error: 'purchaseItemId es requerido' }, { status: 400 });
  }

  // 1. Leer el PurchaseItem
  const purchaseItem = await base44.asServiceRole.entities.PurchaseItems.get(purchaseItemId);
  if (!purchaseItem) {
    return Response.json({ error: 'PurchaseItem no encontrado' }, { status: 404 });
  }

  // 2. Verificar lock de conversión en curso
  if (purchaseItem.conversion_in_progress === true) {
    return Response.json({
      error: 'Ya hay una conversión en curso para este ítem. Espere unos momentos y reintente.',
      code: 'CONVERSION_IN_PROGRESS'
    }, { status: 409 });
  }

  // 3. Verificar si ya se completó la conversión
  const pending = (purchaseItem.quantity || 0) - (purchaseItem.inventory_generated_count || 0);
  if (pending <= 0) {
    return Response.json({
      message: 'Conversión ya completada. Todas las unidades han sido generadas.',
      code: 'ALREADY_COMPLETED',
      inventory_generated_count: purchaseItem.inventory_generated_count,
      quantity: purchaseItem.quantity
    });
  }

  // 4. Adquirir lock lógico
  await base44.asServiceRole.entities.PurchaseItems.update(purchaseItemId, {
    conversion_in_progress: true
  });

  // ─── Determinar category_key ───────────────────────────────────────────────
  // Prioridad: parámetro explícito > campo del PurchaseItem > "laptops" como fallback
  const resolvedCategoryKey = category_key || purchaseItem.category_key || 'laptops';

  // ─── Calcular costo base unitario desde PurchaseItem ──────────────────────
  // item_subtotal / quantity = costo de compra por unidad
  const baseCostPerUnit = purchaseItem.quantity > 0
    ? (purchaseItem.item_subtotal || 0) / purchaseItem.quantity
    : (purchaseItem.estimated_unit_cost_from_order_total || 0);

  // ─── Construir attributes base desde PurchaseItem ─────────────────────────
  // Solo incluye campos con valor real, sin legacy
  const baseAttributes = {};
  if (purchaseItem.brand)        baseAttributes.brand        = purchaseItem.brand;
  if (purchaseItem.model)        baseAttributes.model        = purchaseItem.model;
  if (purchaseItem.line_family)  baseAttributes.line_family  = purchaseItem.line_family;
  if (purchaseItem.cpu)          baseAttributes.cpu          = purchaseItem.cpu;
  if (purchaseItem.ram_gb)       baseAttributes.ram          = `${purchaseItem.ram_gb}GB`;
  if (purchaseItem.storage_gb && purchaseItem.storage_type) {
    baseAttributes.storage = `${purchaseItem.storage_gb}GB ${purchaseItem.storage_type}`;
  } else if (purchaseItem.storage_gb) {
    baseAttributes.storage = `${purchaseItem.storage_gb}GB`;
  }
  if (purchaseItem.screen_size)    baseAttributes.screen_size    = purchaseItem.screen_size;
  if (purchaseItem.screen_type)    baseAttributes.screen_type    = purchaseItem.screen_type;
  if (purchaseItem.form_factor)    baseAttributes.form_factor    = purchaseItem.form_factor;
  if (purchaseItem.condition_grade) baseAttributes.condition     = purchaseItem.condition_grade;

  const createdUnits = [];
  let currentCount = purchaseItem.inventory_generated_count || 0;

  try {
    for (let i = 0; i < pending; i++) {
      // Merge de atributos: base del PurchaseItem + override por unidad si aplica
      const unitOverride = unitsData && unitsData[i] ? unitsData[i] : {};
      const mergedAttributes = { ...baseAttributes, ...(unitOverride.attributes || {}) };

      const unitPayload = {
        purchase_item_id: purchaseItemId,
        import_batch_id: importBatchId || purchaseItem.import_batch_id || null,
        category_key: resolvedCategoryKey,
        attributes: mergedAttributes,
        // SOT v2: cost_purchase_unit = costo base; total_real_unit_cost = SOT activo inicial
        cost_purchase_unit: baseCostPerUnit,
        total_real_unit_cost: baseCostPerUnit,
        status: 'available',
        condition: purchaseItem.condition_grade || null,
        location: unitOverride.location || null,
        images: [],
        main_image: null
      };

      const newUnit = await base44.asServiceRole.entities.InventoryUnits.create(unitPayload);
      createdUnits.push(newUnit.id);
      currentCount++;

      // Incrementar contador en cada éxito (idempotencia incremental)
      await base44.asServiceRole.entities.PurchaseItems.update(purchaseItemId, {
        inventory_generated_count: currentCount
      });
    }

    // 5. Liberar lock
    await base44.asServiceRole.entities.PurchaseItems.update(purchaseItemId, {
      conversion_in_progress: false
    });

    return Response.json({
      success: true,
      created_count: createdUnits.length,
      inventory_unit_ids: createdUnits,
      inventory_generated_count: currentCount,
      quantity: purchaseItem.quantity,
      category_key: resolvedCategoryKey,
      base_cost_per_unit: baseCostPerUnit
    });

  } catch (error) {
    // En caso de error, liberar lock para permitir reintentos
    await base44.asServiceRole.entities.PurchaseItems.update(purchaseItemId, {
      conversion_in_progress: false,
      inventory_generated_count: currentCount
    });
    return Response.json({
      error: error.message,
      partial_created: createdUnits.length,
      inventory_generated_count: currentCount
    }, { status: 500 });
  }
});