import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Valida y sanitiza imágenes de InventoryUnits.
// Se invoca desde automatización on_update de InventoryUnits
// cuando cambian los campos images o main_image.

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { inventoryUnitId } = await req.json();

  if (!inventoryUnitId) {
    return Response.json({ error: 'inventoryUnitId es requerido' }, { status: 400 });
  }

  const unit = await base44.asServiceRole.entities.InventoryUnits.get(inventoryUnitId);
  if (!unit) {
    return Response.json({ error: 'InventoryUnit no encontrada' }, { status: 404 });
  }

  const images = unit.images || [];
  let main_image = unit.main_image || null;

  // Si images está vacío, main_image debe ser null
  if (images.length === 0) {
    main_image = null;
  }

  // Si main_image no está en images, limpiar main_image (no asignar automáticamente)
  if (main_image && !images.includes(main_image)) {
    main_image = null;
  }

  // Solo actualizar si algo cambió
  if (main_image !== unit.main_image) {
    await base44.asServiceRole.entities.InventoryUnits.update(inventoryUnitId, {
      main_image
    });
  }

  return Response.json({
    success: true,
    images_count: images.length,
    main_image
  });
});