/**
 * NEXORA — MAPA PARA DESARROLLADORES
 * Propósito: Obtiene y actualiza secuencias del perfil empresarial; revisar concurrencia y ámbito antes de certificar.
 * Datos/efectos detectados: OrganizationProfile.filter, OrganizationProfile.update
 * Dependencias: Revisar imports y consumidores; sin invoke literal detectado.
 * Límites: Preservar contratos; ver docs/NEXORA-REGRESSION-MATRIX.md. Runtime no certificado.
 * Referencia: docs/NEXORA-INVENTORY.md (base 54e8532).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import {clientForRequest} from './tenant-access.mjs';

// Control transaccional para numeración de documentos (cotizaciones y ventas).
// Incrementa el contador en OrganizationProfile y retorna el número generado.
// type: "quote" | "sale"
Deno.serve(async (req) => {
  // MG01: authenticate and scope every SDK entity operation before legacy logic runs.
    const rawClient = createClientFromRequest(req);
    let base44;
    try { base44 = await clientForRequest(rawClient, req); }
    catch (error) {
      return Response.json({error: error.code || 'TENANT_ACCESS_DENIED'}, {status: error.status || 403});
    }

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { type } = await req.json();

  if (!type || !['quote', 'sale'].includes(type)) {
    return Response.json({ error: 'type debe ser "quote" o "sale"' }, { status: 400 });
  }

  // Obtener el perfil activo
  const profiles = await base44.asServiceRole.entities.OrganizationProfile.filter({ active: true });
  if (!profiles || profiles.length === 0) {
    return Response.json({ error: 'NO_PROFILE', message: 'No existe perfil de organización activo.' }, { status: 404 });
  }

  if (profiles.length !== 1) {
    return Response.json({error:'ORGANIZATION_REQUIRED',message:'Seleccione una empresa para numerar documentos.'}, {status:409});
  }
  const profile = profiles[0];

  const sequenceField = type === 'quote' ? 'next_quote_number_sequence' : 'next_sale_number_sequence';
  const prefixField = type === 'quote' ? 'document_prefix_quote' : 'document_prefix_sale';

  const currentSeq = profile[sequenceField] || 1;
  const prefix = profile[prefixField] || (type === 'quote' ? 'COT' : 'VTA');

  // Incrementar el contador (control transaccional optimista)
  await base44.asServiceRole.entities.OrganizationProfile.update(profile.id, {
    [sequenceField]: currentSeq + 1
  });

  // Formato: PREFIX-00001
  const paddedSeq = String(currentSeq).padStart(5, '0');
  const documentNumber = `${prefix}-${paddedSeq}`;

  return Response.json({
    document_number: documentNumber,
    sequence: currentSeq,
    prefix
  });
});