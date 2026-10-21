/**
 * NEXORA — MAPA PARA DESARROLLADORES
 * Propósito: Entrada HTTP del perfil empresarial. El cambio MG01 exige membresía owner y aún requiere Super Admin y migración.
 * Datos/efectos detectados: Sin acceso directo SDK a entidades detectado.
 * Dependencias: Revisar imports y consumidores; sin invoke literal detectado.
 * Límites: Preservar contratos; ver docs/NEXORA-REGRESSION-MATRIX.md. Runtime no certificado. Gustavo es Super Admin; owner-only requiere corrección y migración.
 * Referencia: docs/NEXORA-INVENTORY.md (base 54e8532).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { getOrganizationProfile } from './handler.mjs';

// MG01: scope full company profile to a verified owner membership.
// Legacy data must be migrated before this draft is merged.
Deno.serve(async (req) => {
 try {
  const base44 = createClientFromRequest(req);
  let input = {};
  if (req.method !== 'GET') {
   const raw = await req.text();
   if (raw) {
    try { input = JSON.parse(raw); }
    catch { return Response.json({error:'INVALID_JSON'}, {status:400}); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) return Response.json({error:'INVALID_JSON'}, {status:400});
   }
  }
  const result = await getOrganizationProfile(base44, input.organization_id);
  return Response.json(result.body, {status:result.status});
 } catch {
  // Do not expose profile details or provider errors on failed authorization lookup.
  return Response.json({error:'PROFILE_LOOKUP_FAILED'}, {status:500});
 }
});
