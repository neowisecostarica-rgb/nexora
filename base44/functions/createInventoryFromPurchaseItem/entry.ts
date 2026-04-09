import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { purchaseItemId, importBatchId, unitsData } = await req.json();

  if (!purchaseItemId) {
    return Response.json({ error: 'purchaseItemId es requerido' }, { status: 400 });
  }

  // 1. Leer el PurchaseItem más reciente
  const purchaseItem = await base44.asServiceRole.entities.PurchaseItems.get(purchaseItemId);
  if (!purchaseItem) {
    return Response.json({ error: 'PurchaseItem no encontrado' }, { status: 404 });
  }

  // 2. Verificar si ya está bloqueado (otra conversión en curso)
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

  // 4. Adquirir el lock lógico
  await base44.asServiceRole.entities.PurchaseItems.update(purchaseItemId, {
    conversion_in_progress: true
  });

  const createdUnits = [];
  let currentCount = purchaseItem.inventory_generated_count || 0;
  const baseCostPerUnit = purchaseItem.item_subtotal > 0
    ? purchaseItem.item_subtotal / purchaseItem.quantity
    : (purchaseItem.estimated_unit_cost_from_order_total || 0);

  try {
    // 5. Crear las unidades pendientes, incrementando el contador por cada éxito
    for (let i = 0; i < pending; i++) {
      const unitPayload = {
        purchase_item_id: purchaseItemId,
        import_batch_id: importBatchId || purchaseItem.import_batch_id || null,
        brand: purchaseItem.brand,
        model: purchaseItem.model,
        cpu_raw: purchaseItem.cpu || '',
        cpu_normalized: normalizeCpu(purchaseItem.cpu || ''),
        ram_gb: purchaseItem.ram_gb || null,
        storage_type_raw: purchaseItem.storage_type || '',
        storage_type: purchaseItem.storage_type || null,
        storage_gb: purchaseItem.storage_gb || null,
        screen_size_raw: purchaseItem.screen_size || '',
        screen_size_normalized: normalizeScreenSize(purchaseItem.screen_size || ''),
        form_factor: purchaseItem.form_factor || null,
        condition_grade: purchaseItem.condition_grade || null,
        status: 'available',
        cost_purchase_unit: baseCostPerUnit,
        total_real_unit_cost: baseCostPerUnit,
        received_date: new Date().toISOString().split('T')[0],
        ...(unitsData && unitsData[i] ? unitsData[i] : {})
      };

      const newUnit = await base44.asServiceRole.entities.InventoryUnits.create(unitPayload);
      createdUnits.push(newUnit.id);
      currentCount++;

      // Incrementar el contador en cada éxito (idempotencia incremental)
      await base44.asServiceRole.entities.PurchaseItems.update(purchaseItemId, {
        inventory_generated_count: currentCount
      });
    }

    // 6. Liberar el lock
    await base44.asServiceRole.entities.PurchaseItems.update(purchaseItemId, {
      conversion_in_progress: false
    });

    return Response.json({
      success: true,
      created_count: createdUnits.length,
      inventory_unit_ids: createdUnits,
      inventory_generated_count: currentCount,
      quantity: purchaseItem.quantity
    });

  } catch (error) {
    // En caso de error, liberar el lock para permitir reintentos
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

function normalizeCpu(cpu) {
  if (!cpu) return '';
  return cpu
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/core i/g, 'i')
    .replace(/intel /g, '')
    .replace(/amd /g, '');
}

function normalizeScreenSize(size) {
  if (!size) return '';
  const match = size.match(/(\d+\.?\d*)/);
  return match ? match[1] : size.trim();
}