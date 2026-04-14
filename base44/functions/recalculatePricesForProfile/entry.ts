/**
 * recalculatePricesForProfile
 *
 * Automation handler: se dispara cuando se actualiza un PricingProfile.
 * Recalcula precios en batch para todas las unidades que usan ese perfil
 * (directamente por assigned_pricing_profile_id, o por category_key, o globalmente
 * si es el perfil default).
 *
 * Solo procesa unidades en estado available o reserved (no sold).
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const payload = await req.json();

  const profile_id = payload?.event?.entity_id;
  const profile = payload?.data;

  if (!profile_id) {
    return Response.json({ error: 'profile_id no encontrado en payload' }, { status: 400 });
  }

  // Recopilar unidades candidatas según el scope del perfil
  let units = [];

  if (profile?.scope_type === 'unit_override') {
    // Solo las unidades con override directo
    units = await base44.asServiceRole.entities.InventoryUnits.filter({
      assigned_pricing_profile_id: profile_id,
      status: { $in: ['available', 'reserved'] }
    });
  } else if (profile?.scope_type === 'category' && profile?.category_key) {
    // Unidades de esa categoría sin override propio
    const categoryUnits = await base44.asServiceRole.entities.InventoryUnits.filter({
      category_key: profile.category_key,
      status: { $in: ['available', 'reserved'] }
    });
    // Excluir las que tienen override propio (se resolverán por su propio perfil)
    units = categoryUnits.filter(u => !u.assigned_pricing_profile_id);
  } else {
    // Perfil global: todas las disponibles sin override ni perfil de categoría explícito
    const allUnits = await base44.asServiceRole.entities.InventoryUnits.filter({
      status: { $in: ['available', 'reserved'] }
    });
    units = allUnits.filter(u => !u.assigned_pricing_profile_id);
  }

  if (units.length === 0) {
    return Response.json({ success: true, total_units: 0, message: 'Sin unidades que recalcular' });
  }

  const BATCH_SIZE = 20;
  const results = { success: 0, failed: 0, errors: [] };

  for (let i = 0; i < units.length; i += BATCH_SIZE) {
    const batch = units.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(unit =>
        base44.asServiceRole.functions.invoke('calculateAndCachePricing', {
          inventory_unit_id: unit.id
        }).then(() => { results.success++; })
          .catch(err => {
            results.failed++;
            results.errors.push({ unit_id: unit.id, error: err.message });
          })
      )
    );
  }

  return Response.json({
    success: true,
    profile_id,
    total_units: units.length,
    ...results
  });
});