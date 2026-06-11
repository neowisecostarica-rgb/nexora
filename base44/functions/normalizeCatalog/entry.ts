/**
 * normalizeCatalog
 *
 * Utilería idempotente para análisis y espejo del catálogo M1.
 *
 * MODOS:
 *   action = "analyze"  → Solo lectura. Genera reporte de candidatos para ProductDefinition.
 *                          NO escribe nada. Candidatos fuzzy son SOLO reportados, nunca fusionados.
 *   action = "mirror"   → Crea ProductDefinitions únicamente por hash exacto (Brand+Model+Category).
 *                          Idempotente: si el hash ya existe, OMITE la creación.
 *                          NUNCA fusiona por similitud.
 *   action = "link"     → Vincula InventoryUnits/PurchaseItems a su ProductDefinition
 *                          si su hash exacto existe en el catálogo. Nullable si no hay match.
 *
 * MOTORES FINANCIEROS: NO TOCADOS. Zero side effects sobre costos, pricing, ventas o reservas.
 *
 * INPUT: { action: "analyze" | "mirror" | "link" }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─── Hash de identidad exacto: Brand|Model|CategoryKey ───────────────────────
// Determinista, reproducible, case-insensitive.
function buildIdentityHash(brand, model, categoryKey) {
  const normalized = `${(brand || '').trim().toUpperCase()}|${(model || '').trim().toUpperCase()}|${(categoryKey || '').trim().toUpperCase()}`;
  return btoa(encodeURIComponent(normalized));
}

// ─── Hash de variante: product_definition_id + attributes canónicos ───────────
function buildVariantHash(productDefinitionId, attributes) {
  const sortedAttrs = JSON.stringify(
    Object.fromEntries(Object.entries(attributes || {}).sort())
  );
  const normalized = `${productDefinitionId}|${sortedAttrs}`;
  return btoa(encodeURIComponent(normalized));
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body = await req.json();
  const action = body.action;

  if (!['analyze', 'mirror', 'link'].includes(action)) {
    return Response.json(
      { error: 'action debe ser: analyze | mirror | link' },
      { status: 400 }
    );
  }

  // ─── Cargar datos fuente ──────────────────────────────────────────────────
  const purchaseItems = await base44.asServiceRole.entities.PurchaseItems.list();
  const inventoryUnits = await base44.asServiceRole.entities.InventoryUnits.list();

  // ─────────────────────────────────────────────────────────────────────────
  // MODO: analyze — Solo lectura, sin escrituras
  // ─────────────────────────────────────────────────────────────────────────
  if (action === 'analyze') {
    const hashMap = {};
    const allSources = [];

    // Agregar PurchaseItems como fuente
    for (const item of purchaseItems) {
      if (!item.brand || !item.model) continue;
      const categoryKey = item.category_key || 'laptops';
      const hash = buildIdentityHash(item.brand, item.model, categoryKey);
      if (!hashMap[hash]) {
        hashMap[hash] = { hash, brand: item.brand, model: item.model, category_key: categoryKey, sources: [] };
      }
      hashMap[hash].sources.push({ source: 'PurchaseItem', id: item.id });
    }

    // Agregar InventoryUnits como fuente
    for (const unit of inventoryUnits) {
      const attrs = unit.attributes || {};
      const brand = attrs.brand || unit.brand;
      const model = attrs.model || unit.model;
      const categoryKey = unit.category_key || 'laptops';
      if (!brand || !model) continue;
      const hash = buildIdentityHash(brand, model, categoryKey);
      if (!hashMap[hash]) {
        hashMap[hash] = { hash, brand, model, category_key: categoryKey, sources: [] };
      }
      hashMap[hash].sources.push({ source: 'InventoryUnit', id: unit.id });
    }

    const candidates = Object.values(hashMap);

    // Reporte de posibles duplicados fuzzy (solo reporte, nunca se fusionan automáticamente)
    const fuzzy_candidates = [];
    const keys = candidates.map(c => `${c.brand} ${c.model}`.toUpperCase());
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        // Similitud básica: misma brand + model que empieza igual (primeras 10 chars)
        if (
          candidates[i].brand.toUpperCase() === candidates[j].brand.toUpperCase() &&
          keys[i].slice(0, 12) === keys[j].slice(0, 12) &&
          candidates[i].hash !== candidates[j].hash
        ) {
          fuzzy_candidates.push({
            candidate_a: { hash: candidates[i].hash, brand: candidates[i].brand, model: candidates[i].model },
            candidate_b: { hash: candidates[j].hash, brand: candidates[j].brand, model: candidates[j].model },
            action_required: 'HUMAN_REVIEW — No se fusionan automáticamente'
          });
        }
      }
    }

    return Response.json({
      mode: 'analyze',
      total_exact_candidates: candidates.length,
      candidates,
      fuzzy_duplicate_candidates: fuzzy_candidates,
      note: 'Reporte solo lectura. Ningún dato fue modificado.'
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MODO: mirror — Crea ProductDefinitions solo por hash exacto (idempotente)
  // ─────────────────────────────────────────────────────────────────────────
  if (action === 'mirror') {
    const existingDefs = await base44.asServiceRole.entities.ProductDefinition.list();
    const existingHashes = new Set(existingDefs.map(d => d.identity_hash));

    const toCreate = {};

    for (const item of purchaseItems) {
      if (!item.brand || !item.model) continue;
      const categoryKey = item.category_key || 'laptops';
      const hash = buildIdentityHash(item.brand, item.model, categoryKey);
      if (!existingHashes.has(hash) && !toCreate[hash]) {
        toCreate[hash] = { brand: item.brand, model: item.model, category_key: categoryKey, identity_hash: hash, is_active: true };
      }
    }

    for (const unit of inventoryUnits) {
      const attrs = unit.attributes || {};
      const brand = attrs.brand || unit.brand;
      const model = attrs.model || unit.model;
      const categoryKey = unit.category_key || 'laptops';
      if (!brand || !model) continue;
      const hash = buildIdentityHash(brand, model, categoryKey);
      if (!existingHashes.has(hash) && !toCreate[hash]) {
        toCreate[hash] = { brand, model, category_key: categoryKey, identity_hash: hash, is_active: true };
      }
    }

    const created = [];
    for (const def of Object.values(toCreate)) {
      const newDef = await base44.asServiceRole.entities.ProductDefinition.create(def);
      created.push({ id: newDef.id, brand: def.brand, model: def.model, category_key: def.category_key });
    }

    return Response.json({
      mode: 'mirror',
      already_existed: existingDefs.length,
      created_count: created.length,
      created,
      skipped_reason: 'Hash exacto ya existía — idempotente',
      note: 'NUNCA fusiona por fuzzy match. Solo crea por hash exacto.'
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MODO: link — Vincula entidades existentes a su ProductDefinition por hash exacto
  // ─────────────────────────────────────────────────────────────────────────
  if (action === 'link') {
    const existingDefs = await base44.asServiceRole.entities.ProductDefinition.list();
    const hashToId = {};
    for (const def of existingDefs) {
      if (def.identity_hash) hashToId[def.identity_hash] = def.id;
    }

    let linked_purchase_items = 0;
    let linked_inventory_units = 0;
    let skipped_no_match = 0;
    const errors = [];

    for (const item of purchaseItems) {
      try {
        if (item.product_definition_id) continue;
        const brand = item.brand || null;
        const model = item.model || null;
        if (!brand || !model) { skipped_no_match++; continue; }
        const categoryKey = item.category_key || 'laptops';
        const hash = buildIdentityHash(brand, model, categoryKey);
        if (hashToId[hash]) {
          await base44.asServiceRole.entities.PurchaseItems.update(item.id, {
            product_definition_id: hashToId[hash]
          });
          linked_purchase_items++;
        } else {
          skipped_no_match++;
        }
      } catch (e) {
        errors.push({ source: 'PurchaseItem', id: item.id, error: e.message });
      }
    }

    for (const unit of inventoryUnits) {
      try {
        if (unit.product_definition_id) continue;
        const attrs = (unit.attributes && typeof unit.attributes === 'object') ? unit.attributes : {};
        const brand = (attrs.brand) || null;
        const model = (attrs.model) || null;
        const categoryKey = unit.category_key || 'laptops';
        if (!brand || !model) { skipped_no_match++; continue; }
        const hash = buildIdentityHash(brand, model, categoryKey);
        if (hashToId[hash]) {
          await base44.asServiceRole.entities.InventoryUnits.update(unit.id, {
            product_definition_id: hashToId[hash]
          });
          linked_inventory_units++;
        } else {
          skipped_no_match++;
        }
      } catch (e) {
        errors.push({ source: 'InventoryUnit', id: unit.id, error: e.message });
      }
    }

    return Response.json({
      mode: 'link',
      linked_purchase_items,
      linked_inventory_units,
      skipped_no_match,
      errors,
      note: 'Idempotente. Solo vincula si hash exacto existe. Nullable si no hay match.'
    });
  }
});