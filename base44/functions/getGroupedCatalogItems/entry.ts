/**
 * getGroupedCatalogItems
 *
 * Vista comercial del catálogo — derivada EXCLUSIVAMENTE de InventoryUnits.
 *
 * REGLAS CRÍTICAS:
 * - Solo lee unidades con status = "available"
 * - NO crea ni lee ninguna entidad separada de catálogo
 * - Agrupación dinámica por CategoryConfig.grouping_keys (sin hardcode)
 * - stock, precios e imágenes viven solo en InventoryUnits
 * - Catalog es una vista, nunca una fuente de datos
 *
 * INPUT: { category_key? } — opcional para filtrar por categoría
 * OUTPUT: array de grupos con available_quantity, price_from, unit_ids, etc.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── CategoryConfig embebida (misma lógica que lib/categoryConfig.js) ────────
// Nota: backend functions no pueden importar desde lib/ (no local imports).
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
    .replace(/\{(\w+)\}/g, (_, key) =>
      attributes[key] !== undefined && attributes[key] !== null
        ? String(attributes[key])
        : ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

// Construye la group_key concatenando los valores de grouping_keys
function buildGroupKey(attributes, grouping_keys) {
  return grouping_keys
    .map(k => String(attributes[k] ?? ""))
    .join("|");
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const body = await req.json().catch(() => ({}));
  const { category_key } = body;

  // ─── QUERY BASE: solo unidades disponibles ────────────────────────────────
  const filterQuery = { status: "available" };
  if (category_key) filterQuery.category_key = category_key;

  const units = await base44.asServiceRole.entities.InventoryUnits.filter(filterQuery);

  if (!units || units.length === 0) {
    return Response.json({ success: true, groups: [] });
  }

  // ─── AGRUPACIÓN DINÁMICA por CategoryConfig.grouping_keys ─────────────────
  const groupMap = new Map();

  for (const unit of units) {
    const catConfig = CategoryConfig[unit.category_key];
    const attributes = unit.attributes || {};

    // Categorías desconocidas: grupo único por normalized_display_name
    const grouping_keys = catConfig?.grouping_keys || ["category_key"];
    const group_key = `${unit.category_key}::${buildGroupKey(attributes, grouping_keys)}`;

    if (!groupMap.has(group_key)) {
      groupMap.set(group_key, {
        category_key: unit.category_key,
        group_key,
        display_name: unit.normalized_display_name || buildDisplayName(
          catConfig?.display_template || "{category_key}",
          { ...attributes, category_key: unit.category_key }
        ),
        main_image: null,
        images: [],
        available_quantity: 0,
        price_from: null,
        wholesale_price_from: null,
        minimum_price_from: null,
        sample_attributes: attributes,
        inventory_unit_ids: []
      });
    }

    const group = groupMap.get(group_key);

    // Acumular unidades
    group.inventory_unit_ids.push(unit.id);
    group.available_quantity++;

    // price_from = mínimo retail_price del grupo
    if (unit.retail_price > 0) {
      if (group.price_from === null || unit.retail_price < group.price_from) {
        group.price_from = unit.retail_price;
      }
    }

    // wholesale_price_from = mínimo wholesale_price del grupo
    if (unit.wholesale_price > 0) {
      if (group.wholesale_price_from === null || unit.wholesale_price < group.wholesale_price_from) {
        group.wholesale_price_from = unit.wholesale_price;
      }
    }

    // minimum_price_from = mínimo minimum_price del grupo
    if (unit.minimum_price > 0) {
      if (group.minimum_price_from === null || unit.minimum_price < group.minimum_price_from) {
        group.minimum_price_from = unit.minimum_price;
      }
    }

    // Imagen representativa: preferir main_image, fallback primera imagen disponible
    if (!group.main_image) {
      if (unit.main_image) {
        group.main_image = unit.main_image;
      } else if (unit.images && unit.images.length > 0) {
        group.main_image = unit.images[0];
      }
    }

    // Acumular imágenes únicas del grupo (sin duplicar)
    const allUnitImages = [];
    if (unit.main_image) allUnitImages.push(unit.main_image);
    if (unit.images) allUnitImages.push(...unit.images);
    for (const img of allUnitImages) {
      if (!group.images.includes(img)) group.images.push(img);
    }
  }

  const groups = Array.from(groupMap.values());

  // Ordenar: por categoría, luego por available_quantity descendente
  groups.sort((a, b) => {
    if (a.category_key !== b.category_key) return a.category_key.localeCompare(b.category_key);
    return b.available_quantity - a.available_quantity;
  });

  return Response.json({
    success: true,
    total_units: units.length,
    total_groups: groups.length,
    groups
  });
});