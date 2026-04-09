import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Catalog service: agrupa InventoryUnits disponibles y devuelve DTOs por grupo.
// group_key se calcula dinámicamente aquí. No se persiste en BD.

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Obtener unidades disponibles con pricing_profile asignado y precio válido
  const units = await base44.asServiceRole.entities.InventoryUnits.filter({
    status: 'available'
  });

  // Filtrar unidades vendibles (con precio calculado)
  const sellableUnits = units.filter(u =>
    u.pricing_profile_id &&
    u.retail_price > 0 &&
    u.total_real_unit_cost > 0
  );

  // Agrupar por group_key calculado dinámicamente
  const groups = {};

  for (const unit of sellableUnits) {
    const key = buildGroupKey(unit);

    if (!groups[key]) {
      groups[key] = {
        group_key: key,
        brand: unit.brand,
        model: unit.model,
        cpu: unit.cpu_normalized || unit.cpu_raw || '',
        ram_gb: unit.ram_gb,
        storage_type: unit.storage_type,
        storage_gb: unit.storage_gb,
        screen_size: unit.screen_size_normalized || unit.screen_size_raw || '',
        condition_grade: unit.condition_grade,
        form_factor: unit.form_factor,
        stock_available: 0,
        representative_image: null,
        base_price_from: Infinity,
        spec_summary: buildSpecSummary(unit),
        unit_ids: []
      };
    }

    groups[key].stock_available++;
    groups[key].unit_ids.push(unit.id);

    // Precio mínimo como "desde"
    if (unit.retail_price < groups[key].base_price_from) {
      groups[key].base_price_from = unit.retail_price;
    }

    // Imagen representativa: preferir main_image, fallback a primera imagen disponible
    if (!groups[key].representative_image) {
      if (unit.main_image) {
        groups[key].representative_image = unit.main_image;
      } else if (unit.images && unit.images.length > 0) {
        groups[key].representative_image = unit.images[0];
      }
    }
  }

  // Convertir a array y limpiar campos internos
  const catalogItems = Object.values(groups).map(g => ({
    group_key: g.group_key,
    brand: g.brand,
    model: g.model,
    cpu: g.cpu,
    ram_gb: g.ram_gb,
    storage_type: g.storage_type,
    storage_gb: g.storage_gb,
    screen_size: g.screen_size,
    condition_grade: g.condition_grade,
    form_factor: g.form_factor,
    stock_available: g.stock_available,
    representative_image: g.representative_image,
    base_price_from: g.base_price_from === Infinity ? 0 : g.base_price_from,
    spec_summary: g.spec_summary
  }));

  // Ordenar: mayor stock primero, luego por marca/modelo
  catalogItems.sort((a, b) => {
    if (b.stock_available !== a.stock_available) return b.stock_available - a.stock_available;
    return `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`);
  });

  return Response.json({ catalog: catalogItems, total_groups: catalogItems.length });
});

function buildGroupKey(unit) {
  // Orden fijo: BRAND-MODEL-CPU-RAM-STORAGE_TYPE-STORAGE_GB-SCREEN-CONDITION
  const parts = [
    normalize(unit.brand),
    normalize(unit.model),
    normalize(unit.cpu_normalized || unit.cpu_raw || ''),
    String(unit.ram_gb || ''),
    normalize(unit.storage_type || ''),
    String(unit.storage_gb || ''),
    normalize(unit.screen_size_normalized || unit.screen_size_raw || ''),
    normalize(unit.condition_grade || '')
  ];
  return parts.join('|');
}

function normalize(str) {
  return String(str || '').toLowerCase().trim().replace(/\s+/g, '-');
}

function buildSpecSummary(unit) {
  const parts = [];
  if (unit.cpu_normalized || unit.cpu_raw) parts.push(unit.cpu_normalized || unit.cpu_raw);
  if (unit.ram_gb) parts.push(`${unit.ram_gb}GB RAM`);
  if (unit.storage_gb && unit.storage_type) parts.push(`${unit.storage_gb}GB ${unit.storage_type}`);
  if (unit.screen_size_normalized || unit.screen_size_raw) parts.push(`${unit.screen_size_normalized || unit.screen_size_raw}"`);
  if (unit.condition_grade) parts.push(`Grado ${unit.condition_grade}`);
  return parts.join(' · ');
}