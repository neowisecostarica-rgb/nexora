import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Congela el costo histórico en SaleItems cuando se finaliza una venta.
// Debe invocarse cuando Sale pasa a status "completed".
// Actualiza SaleItems con costo congelado y marca InventoryUnits como "sold".

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { saleId } = await req.json();

  if (!saleId) {
    return Response.json({ error: 'saleId es requerido' }, { status: 400 });
  }

  const sale = await base44.asServiceRole.entities.Sales.get(saleId);
  if (!sale) {
    return Response.json({ error: 'Sale no encontrada' }, { status: 404 });
  }

  if (sale.status !== 'completed') {
    return Response.json({ error: 'Solo se puede congelar costos de ventas con status "completed"' }, { status: 400 });
  }

  const saleItems = await base44.asServiceRole.entities.SaleItems.filter({ sale_id: saleId });

  let totalCogs = 0;
  let totalRevenue = 0;
  let totalProfit = 0;

  for (const item of saleItems) {
    if (!item.inventory_unit_id) continue;

    const unit = await base44.asServiceRole.entities.InventoryUnits.get(item.inventory_unit_id);
    if (!unit) continue;

    // Congelar costo histórico en el SaleItem
    const frozenCost = unit.total_real_unit_cost || 0;
    const salePrice = item.unit_sale_price || 0;
    const profit = salePrice - frozenCost;
    const marginPct = salePrice > 0 ? ((profit / salePrice) * 100) : 0;

    await base44.asServiceRole.entities.SaleItems.update(item.id, {
      unit_cost: frozenCost,
      unit_profit: profit,
      margin_percent_at_sale: Math.round(marginPct * 100) / 100,
      line_total: salePrice * (item.quantity || 1)
    });

    // Congelar costo en InventoryUnit y marcar como vendida
    await base44.asServiceRole.entities.InventoryUnits.update(unit.id, {
      status: 'sold',
      cost_frozen_at_sale: frozenCost
    });

    totalCogs += frozenCost * (item.quantity || 1);
    totalRevenue += salePrice * (item.quantity || 1);
    totalProfit += profit * (item.quantity || 1);
  }

  // Actualizar totales en la Sale
  const grossMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;
  await base44.asServiceRole.entities.Sales.update(saleId, {
    cogs_total: totalCogs,
    gross_profit_total: totalProfit,
    gross_margin_percent: Math.round(grossMargin * 100) / 100,
    total: totalRevenue
  });

  return Response.json({
    success: true,
    sale_id: saleId,
    cogs_total: totalCogs,
    revenue_total: totalRevenue,
    gross_profit: totalProfit,
    gross_margin_percent: Math.round(grossMargin * 100) / 100
  });
});