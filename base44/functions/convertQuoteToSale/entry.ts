/**
 * convertQuoteToSale — cierre del camino cotización→venta.
 *
 * Propósito: convertir una cotización con partidas en venta congelando el costo real
 * de cada unidad, sin que el navegador escriba finanzas directamente.
 * Datos leídos: Quotes, QuoteItems, InventoryUnits, Customers, Sales (idempotencia).
 * Datos escritos: Sales, SaleItems, InventoryUnits.status, Quotes.sale_id/converted_at.
 * Dependencias: generateDocumentNumber (type=sale) para numeración; gateway tenantData
 * para resolver empresa autorizada y validar referencias entre empresas.
 * Reglas que protege: una sola venta por cotización (Sales.quote_id); unidad ya vendida
 * no se revende; costo congelado sale de InventoryUnits.total_real_unit_cost (SOT) y solo
 * cae al campo legacy cuando el total aún no fue calculado; campos escritos existen en el
 * esquema (SaleItems.unit_cost_frozen / unit_price_sold / profit_amount).
 * Límites conocidos: NO es atómico (sin transacciones ni índices únicos); la marca
 * conversion_in_progress evita dobles clics, no carreras. Si falla a mitad, hay que revisar
 * y reintentar: la idempotencia por Sales.quote_id evita una segunda venta, no unidades
 * parcialmente marcadas. No recalcula precios ni publica costos parciales.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { clientForRequest } from './tenant-access.mjs';

const CHANNEL_MAP = { retail: 'retail', wholesale: 'wholesale', promo: 'direct', marketplace: 'marketplace' };

Deno.serve(async (req) => {
  const rawClient = createClientFromRequest(req);
  let base44;
  try { base44 = await clientForRequest(rawClient, req); }
  catch (error) { return Response.json({ error: error.code || 'TENANT_ACCESS_DENIED' }, { status: error.status || 403 }); }

  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body = {};
  try { body = await req.json(); } catch { return Response.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  const quoteId = body?.quoteId;
  if (!quoteId || typeof quoteId !== 'string') return Response.json({ error: 'quoteId es requerido' }, { status: 400 });

  const entities = base44.entities;
  const quote = await entities.Quotes.get(quoteId);
  if (!quote) return Response.json({ error: 'Cotización no encontrada' }, { status: 404 });

  // Idempotencia: una venta por cotización.
  const existing = await entities.Sales.filter({ quote_id: quoteId }, '-created_date', 1);
  if (existing.length > 0) {
    return Response.json({ code: 'ALREADY_CONVERTED', sale_id: existing[0].id, sale_number: existing[0].sale_number || null });
  }

  if (quote.conversion_in_progress === true) {
    return Response.json({ error: 'La cotización ya tiene una conversión en curso', code: 'CONVERSION_IN_PROGRESS' }, { status: 409 });
  }

  const items = await entities.QuoteItems.filter({ quote_id: quoteId }, undefined, 500);
  if (items.length === 0) return Response.json({ error: 'La cotización no tiene partidas', code: 'EMPTY_QUOTE' }, { status: 400 });

  await entities.Quotes.update(quoteId, { conversion_in_progress: true });

  try {
    const numberRes = await base44.functions.invoke('generateDocumentNumber', { type: 'sale' });
    const saleNumber = numberRes?.data?.document_number;
    if (!saleNumber) throw new Error('No se pudo generar el número de venta');

    const customer = quote.customer_id ? await entities.Customers.get(quote.customer_id).catch(() => null) : null;

    const lines = [];
    let cogsTotal = 0;
    for (const item of items) {
      const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
      const price = Number(item.unit_price) || 0;
      let unitCost = 0;

      if (item.inventory_unit_id) {
        const unit = await entities.InventoryUnits.get(item.inventory_unit_id);
        if (!unit) throw new Error(`Unidad ${item.inventory_unit_id} no accesible en esta empresa`);
        if (unit.status === 'sold') throw new Error(`La unidad de "${item.description}" ya fue vendida`);
        // SOT: total_real_unit_cost manda. Fallback legacy solo si el motor no lo calculó aún.
        unitCost = Number(unit.total_real_unit_cost) || Number(unit.legacy_real_unit_cost) || 0;
      }

      const lineTotal = Math.round(price * quantity * 100) / 100;
      const lineCost = Math.round(unitCost * quantity * 100) / 100;
      cogsTotal += lineCost;
      lines.push({
        inventory_unit_id: item.inventory_unit_id || null,
        description: item.description || '',
        quantity,
        unit_price_sold: price,
        unit_cost_frozen: unitCost,
        line_total: lineTotal,
        profit_amount: Math.round((lineTotal - lineCost) * 100) / 100,
      });
    }

    const total = Number(quote.total) || 0;
    const grossProfit = Math.round((total - cogsTotal) * 100) / 100;
    const grossMargin = total > 0 ? Math.round((grossProfit / total) * 10000) / 100 : 0;

    const sale = await entities.Sales.create({
      sale_number: saleNumber,
      sale_date: new Date().toISOString().split('T')[0],
      customer_id: quote.customer_id || null,
      customer_name: quote.customer_name || customer?.full_name || 'Cliente',
      customer_phone: customer?.phone || '',
      customer_email: customer?.email || '',
      quote_id: quoteId,
      ...(quote.currency ? { currency: quote.currency } : {}),
      channel: CHANNEL_MAP[quote.sales_channel] || 'direct',
      sale_type: CHANNEL_MAP[quote.sales_channel] || 'direct',
      subtotal: Number(quote.subtotal) || 0,
      discount_total: Number(quote.discount_total) || 0,
      tax_total: Number(quote.tax_total) || 0,
      total,
      cogs_total: cogsTotal,
      gross_profit_total: grossProfit,
      gross_margin_percent: grossMargin,
      status: 'completed',
      external_invoice_status: 'none',
    });

    for (const line of lines) {
      await entities.SaleItems.create({ ...line, sale_id: sale.id });
      if (line.inventory_unit_id) {
        await entities.InventoryUnits.update(line.inventory_unit_id, { status: 'sold' });
      }
    }

    await entities.Quotes.update(quoteId, {
      status: 'approved',
      sale_id: sale.id,
      converted_at: new Date().toISOString(),
      conversion_in_progress: false,
    });

    return Response.json({ code: 'CONVERTED', sale_id: sale.id, sale_number: saleNumber, cogs_total: cogsTotal, total });
  } catch (error) {
    await entities.Quotes.update(quoteId, { conversion_in_progress: false }).catch(() => {});
    return Response.json({ error: error.message || 'No se pudo convertir la cotización', code: 'CONVERSION_FAILED' }, { status: 500 });
  }
});