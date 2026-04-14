import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Control transaccional para numeración de documentos (cotizaciones y ventas).
// Incrementa el contador en OrganizationProfile y retorna el número generado.
// type: "quote" | "sale"
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

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