import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Función de recálculo masivo cuando cambia un PricingProfile.
// Se invoca desde automatización de entidad PricingProfiles (on_update).
// Procesa las unidades en lotes para no bloquear el sistema.

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { pricingProfileId } = await req.json();

  if (!pricingProfileId) {
    return Response.json({ error: 'pricingProfileId es requerido' }, { status: 400 });
  }

  // Obtener todas las unidades con este perfil (disponibles únicamente, sold ya tienen costo congelado)
  const units = await base44.asServiceRole.entities.InventoryUnits.filter({
    pricing_profile_id: pricingProfileId,
    status: { $in: ['available', 'reserved', 'quoted'] }
  });

  const BATCH_SIZE = 20;
  const results = { success: 0, failed: 0, errors: [] };

  // Procesar en lotes para evitar timeout y carga excesiva
  for (let i = 0; i < units.length; i += BATCH_SIZE) {
    const batch = units.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(unit =>
      base44.asServiceRole.functions.invoke('calculateAndCachePricing', {
        inventoryUnitId: unit.id
      }).then(() => {
        results.success++;
      }).catch(err => {
        results.failed++;
        results.errors.push({ unitId: unit.id, error: err.message });
      })
    );

    await Promise.all(batchPromises);
  }

  return Response.json({
    success: true,
    total_units: units.length,
    ...results
  });
});