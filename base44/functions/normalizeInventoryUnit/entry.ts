/**
 * normalizeInventoryUnit
 *
 * Función backend que genera normalized_display_name para un InventoryUnit
 * usando CategoryConfig + buildDisplayName.
 *
 * REGLAS:
 * - NO usa switch(category)
 * - USA CategoryConfig como única fuente de templates
 * - Si la categoría no existe en CategoryConfig, usa un fallback genérico
 * - Puede ser invocada manualmente o por automation
 *
 * INPUT: { inventory_unit_id }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// CategoryConfig inline (NO importar desde lib/ — backend es independiente)
const CategoryConfig = {
  laptops: {
    display_template: "{brand} {model} {cpu} {ram} {storage}",
    grouping_keys: ["brand", "model", "cpu", "ram", "storage", "condition"]
  },
  smartphones: {
    display_template: "{brand} {model} {storage} {color}",
    grouping_keys: ["brand", "model", "storage", "color", "condition"]
  },
  monitors: {
    display_template: "{brand} {model} {screen_size} {resolution}",
    grouping_keys: ["brand", "model", "screen_size", "resolution", "condition"]
  },
  sneakers: {
    display_template: "{brand} {model} {size} {color}",
    grouping_keys: ["brand", "model", "size", "color", "condition"]
  }
};

function buildDisplayName(template, attributes) {
  return template
    .replace(/\{(\w+)\}/g, (_, key) => {
      return attributes[key] !== undefined && attributes[key] !== null
        ? String(attributes[key])
        : "";
    })
    .replace(/\s+/g, " ")
    .trim();
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { inventory_unit_id } = await req.json();

  if (!inventory_unit_id) {
    return Response.json({ error: 'inventory_unit_id requerido' }, { status: 400 });
  }

  const unit = await base44.asServiceRole.entities.InventoryUnits.get(inventory_unit_id);
  if (!unit) {
    return Response.json({ error: 'InventoryUnit no encontrada' }, { status: 404 });
  }

  const categoryKey = unit.category_key || 'unknown';
  const attributes = unit.attributes || {};

  // Buscar template en CategoryConfig — SIN switch, SIN hardcode
  const config = CategoryConfig[categoryKey];

  let normalized_display_name;
  if (config && config.display_template) {
    normalized_display_name = buildDisplayName(config.display_template, attributes);
  } else {
    // Fallback genérico para categorías no registradas aún en CategoryConfig
    const fallbackParts = Object.values(attributes).filter(Boolean).map(String);
    normalized_display_name = fallbackParts.join(" ").replace(/\s+/g, " ").trim() || `[${categoryKey}]`;
  }

  await base44.asServiceRole.entities.InventoryUnits.update(inventory_unit_id, {
    normalized_display_name
  });

  return Response.json({
    success: true,
    inventory_unit_id,
    category_key: categoryKey,
    normalized_display_name
  });
});