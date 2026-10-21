/**
 * NEXORA — MAPA PARA DESARROLLADORES
 * Propósito: finalizeSaleWithCostFreeze — ARCHIVADA / ZOMBIE ESTA FUNCIÓN ESTÁ DESACTIVADA Y NO DEBE INVOCARSE.
 * Datos/efectos detectados: Sin acceso directo SDK a entidades detectado.
 * Dependencias: Revisar imports y consumidores; sin invoke literal detectado.
 * Límites: Preservar contratos; ver docs/NEXORA-REGRESSION-MATRIX.md. Runtime no certificado. También existe venta directa en QuoteDetail; exclusividad y atomicidad antiguas no certificadas.
 * Referencia: docs/NEXORA-INVENTORY.md (base 54e8532).
 */
/**
 * finalizeSaleWithCostFreeze — ARCHIVADA / ZOMBIE
 *
 * ESTA FUNCIÓN ESTÁ DESACTIVADA Y NO DEBE INVOCARSE.
 *
 * El freeze de costo ocurre EXCLUSIVAMENTE en convertReservationToSale
 * en el mismo paso atómico de creación de SaleItem.
 *
 * Referencias legacy eliminadas en BLOQUE 9 — NEXORA v1.0
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (_req) => {
  return Response.json({
    error: 'DEPRECATED',
    message: 'Esta función está archivada. El freeze de costo ocurre en convertReservationToSale.'
  }, { status: 410 });
});