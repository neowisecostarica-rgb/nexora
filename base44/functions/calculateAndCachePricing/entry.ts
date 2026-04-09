import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

  // Si no tiene perfil de precios, poner precios en 0 (no vendible)
  if (!unit.pricing_profile_id) {
    await base44.asServiceRole.entities.InventoryUnits.update(inventoryUnitId, {
      retail_price: 0,
      wholesale_price: 0,
      minimum_sale_price: 0,
      margin_percent: 0,
      pricing_calculated_at: new Date().toISOString()
    });
    return Response.json({ success: true, message: 'Sin perfil de precios. Precios establecidos en 0.' });
  }

  const profile = await base44.asServiceRole.entities.PricingProfiles.get(unit.pricing_profile_id);
  if (!profile) {
    await base44.asServiceRole.entities.InventoryUnits.update(inventoryUnitId, {
      retail_price: 0,
      wholesale_price: 0,
      minimum_sale_price: 0,
      margin_percent: 0,
      pricing_calculated_at: new Date().toISOString()
    });
    return Response.json({ success: true, message: 'Perfil de precios inválido. Precios establecidos en 0.' });
  }

  const cost = unit.total_real_unit_cost || 0;

  if (cost <= 0) {
    return Response.json({ error: 'Costo real unitario debe ser mayor a 0' }, { status: 400 });
  }

  const targetMargin = (profile.target_margin_percent || 30) / 100;
  const minMargin = (profile.min_margin_percent || 15) / 100;

  const retailRaw = cost / (1 - targetMargin);
  const minRaw = cost / (1 - minMargin);
  const wholesaleRaw = cost / (1 - (targetMargin * 0.75));

  const retail_price = applyRounding(retailRaw, profile.rounding_rule);
  const minimum_sale_price = applyRounding(minRaw, profile.rounding_rule);
  const wholesale_price = applyRounding(wholesaleRaw, profile.rounding_rule);
  const margin_percent = ((retail_price - cost) / retail_price) * 100;

  // Validación: precios no negativos
  if (retail_price < 0 || minimum_sale_price < 0 || wholesale_price < 0) {
    return Response.json({ error: 'Los precios calculados no pueden ser negativos' }, { status: 400 });
  }

  await base44.asServiceRole.entities.InventoryUnits.update(inventoryUnitId, {
    retail_price,
    wholesale_price,
    minimum_sale_price,
    margin_percent: Math.round(margin_percent * 100) / 100,
    pricing_calculated_at: new Date().toISOString()
  });

  return Response.json({
    success: true,
    retail_price,
    wholesale_price,
    minimum_sale_price,
    margin_percent: Math.round(margin_percent * 100) / 100
  });
});

function applyRounding(price, rule) {
  if (!rule || rule === 'none') return Math.round(price * 100) / 100;
  if (rule === 'round_1') return Math.ceil(price);
  if (rule === 'round_5') return Math.ceil(price / 5) * 5;
  if (rule === 'round_10') return Math.ceil(price / 10) * 10;
  return Math.round(price * 100) / 100;
}