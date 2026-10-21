/**
 * NEXORA — MAPA PARA DESARROLLADORES
 * Propósito: Automation handler: se dispara cuando cambia real_unit_cost o assigned_pricing_profile_id en InventoryUnits.
 * Datos/efectos detectados: Sin acceso directo SDK a entidades detectado.
 * Dependencias: calculateAndCachePricing
 * Límites: Preservar contratos; ver docs/NEXORA-REGRESSION-MATRIX.md. Runtime no certificado.
 * Referencia: docs/NEXORA-INVENTORY.md (base 54e8532).
 */
/**
 * recalculatePricingOnCostChange
 *
 * Automation handler: se dispara cuando cambia real_unit_cost o
 * assigned_pricing_profile_id en InventoryUnits.
 * Delega el cálculo a calculateAndCachePricing.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import {clientForRequest} from './tenant-access.mjs';

Deno.serve(async (req) => {
  // MG01: scope SDK entity operations before legacy logic runs.
    const rawClient = createClientFromRequest(req);
    let base44;
    try { base44 = await clientForRequest(rawClient, req); }
    catch (error) {
      return Response.json({error: error.code || 'TENANT_ACCESS_DENIED'}, {status: error.status || 403});
    }
  const payload = await req.json();
  const entity_id = payload?.event?.entity_id;

  if (!entity_id) {
    return Response.json({ error: 'entity_id no encontrado en el payload' }, { status: 400 });
  }

  // Unidades vendidas no se recalculan
  const unit = payload?.data;
  if (unit?.status === 'sold') {
    return Response.json({ skipped: true, reason: 'Unidad ya vendida' });
  }

  const result = await base44.asServiceRole.functions.invoke('calculateAndCachePricing', {
    inventory_unit_id: entity_id
  });

  return Response.json({ success: true, entity_id, result });
});