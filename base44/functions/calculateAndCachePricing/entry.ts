/**
 * calculateAndCachePricing
 *
 * Motor de precios central. Resuelve el PricingProfile correcto para una unidad
 * y calcula + guarda los precios en InventoryUnits.
 *
 * LÓGICA DE RESOLUCIÓN DE PERFIL (resolvePricingProfile):
 *   1. InventoryUnits.assigned_pricing_profile_id → perfil específico de la unidad
 *   2. PricingProfile con scope_type="category" y category_key = unidad.category_key
 *   3. PricingProfile con is_default = true (fallback global)
 *
 * REGLAS CRÍTICAS:
 * - Pricing NUNCA se calcula en frontend
 * - Pricing NUNCA se escribe manualmente como fuente
 * - total_real_unit_cost es el SOT del costo (nunca pricing, nunca promedio)
 * - Fallback temporal: legacy_real_unit_cost (si total_real_unit_cost es 0/null)
 *   → emite warning SOT_FALLBACK_USED para identificar registros pendientes de migración
 * - Unidades sold NO se recalculan (costo ya congelado en SaleItem)
 *
 * INPUT: { inventory_unit_id }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Lógica de redondeo según regla del perfil ───────────────────────────────
function applyRounding(price, rule) {
  if (!rule || rule === 'none') return Math.round(price * 100) / 100;
  if (rule === 'round_1')   return Math.ceil(price);
  if (rule === 'round_5')   return Math.ceil(price / 5) * 5;
  if (rule === 'round_10')  return Math.ceil(price / 10) * 10;
  if (rule === 'round_100') return Math.ceil(price / 100) * 100;
  return Math.round(price * 100) / 100;
}

// ─── Resolución de perfil: unit override → category → global default ──────────
async function resolvePricingProfile(base44, unit) {
  // 1. Override directo en la unidad
  if (unit.assigned_pricing_profile_id) {
    const profile = await base44.asServiceRole.entities.PricingProfiles.get(
      unit.assigned_pricing_profile_id
    );
    if (profile && profile.is_active) return profile;
  }

  // 2. Perfil por categoría
  if (unit.category_key) {
    const categoryProfiles = await base44.asServiceRole.entities.PricingProfiles.filter({
      scope_type: 'category',
      category_key: unit.category_key,
      is_active: true
    });
    if (categoryProfiles && categoryProfiles.length > 0) return categoryProfiles[0];
  }

  // 3. Fallback global (is_default = true)
  const defaultProfiles = await base44.asServiceRole.entities.PricingProfiles.filter({
    is_default: true,
    is_active: true
  });
  if (defaultProfiles && defaultProfiles.length > 0) return defaultProfiles[0];

  return null;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Soporta invocación desde automation (sin user) y desde frontend (con user)
  const body = await req.json();

  // Compatibilidad: acepta inventory_unit_id (nuevo) o inventoryUnitId (legado)
  const inventory_unit_id = body.inventory_unit_id || body.inventoryUnitId
    || body?.event?.entity_id;

  if (!inventory_unit_id) {
    return Response.json({ error: 'inventory_unit_id es requerido' }, { status: 400 });
  }

  // Obtener unidad
  const unit = await base44.asServiceRole.entities.InventoryUnits.get(inventory_unit_id);
  if (!unit) {
    return Response.json({ error: 'InventoryUnit no encontrada' }, { status: 404 });
  }

  // Las unidades vendidas NO se recalculan — costo ya congelado en SaleItem
  if (unit.status === 'sold') {
    return Response.json({
      skipped: true,
      reason: 'Unidad ya vendida — precios congelados en SaleItem'
    });
  }

  // SOT v2: fuente primaria = total_real_unit_cost
  // Fallback temporal permitido: legacy_real_unit_cost (registros históricos sin migrar)
  let cost = unit.total_real_unit_cost || 0;
  let usedFallback = false;

  if (cost <= 0) {
    const fallbackCost = unit.legacy_real_unit_cost || 0;
    if (fallbackCost > 0) {
      cost = fallbackCost;
      usedFallback = true;
      console.warn(`[SOT_FALLBACK_USED] inventory_unit_id: ${inventory_unit_id} | Reason: total_real_unit_cost missing or zero | Fallback: legacy_real_unit_cost (${fallbackCost}) | Action: unit requires cost recalculation`);
    }
  }

  if (cost <= 0) {
    return Response.json({ error: 'total_real_unit_cost debe ser mayor a 0 (sin fallback disponible)' }, { status: 400 });
  }

  // Resolver perfil de precios
  const profile = await resolvePricingProfile(base44, unit);
  if (!profile) {
    // Sin perfil: limpiar precios calculados
    await base44.asServiceRole.entities.InventoryUnits.update(inventory_unit_id, {
      retail_price: 0,
      wholesale_price: 0,
      minimum_price: 0,
      margin_percent: 0
    });
    return Response.json({
      success: true,
      skipped: true,
      reason: 'Sin PricingProfile aplicable — precios establecidos en 0'
    });
  }

  // ─── Cálculo de precios ───────────────────────────────────────────────────
  // Fórmula: price = cost / (1 - margin%)
  const marginRetail    = (profile.margin_retail    || 30) / 100;
  const marginWholesale = (profile.margin_wholesale || 15) / 100;
  const marginMinimum   = (profile.margin_minimum   ||  5) / 100;

  const retailRaw    = cost / (1 - marginRetail);
  const wholesaleRaw = cost / (1 - marginWholesale);
  const minimumRaw   = cost / (1 - marginMinimum);

  const retail_price    = applyRounding(retailRaw,    profile.rounding_rule);
  const wholesale_price = applyRounding(wholesaleRaw, profile.rounding_rule);
  const minimum_price   = applyRounding(minimumRaw,   profile.rounding_rule);
  const margin_percent  = retail_price > 0
    ? Math.round(((retail_price - cost) / retail_price) * 10000) / 100
    : 0;

  // ─── Persistir en InventoryUnits ─────────────────────────────────────────
  await base44.asServiceRole.entities.InventoryUnits.update(inventory_unit_id, {
    retail_price,
    wholesale_price,
    minimum_price,
    margin_percent
  });

  return Response.json({
    success: true,
    inventory_unit_id,
    profile_id: profile.id,
    profile_name: profile.name,
    cost,
    cost_source: usedFallback ? 'legacy_real_unit_cost (FALLBACK_TEMPORAL)' : 'total_real_unit_cost',
    retail_price,
    wholesale_price,
    minimum_price,
    margin_percent
  });
});