import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// SOT: Única función autorizada para obtener el perfil activo de la organización.
// Devuelve el perfil activo o error si no existe o hay duplicados.
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profiles = await base44.asServiceRole.entities.OrganizationProfile.filter({ active: true });

  if (!profiles || profiles.length === 0) {
    return Response.json({
      error: 'NO_PROFILE',
      message: 'No existe un perfil de organización activo. Configure su empresa en Ajustes.'
    }, { status: 404 });
  }

  if (profiles.length > 1) {
    return Response.json({
      error: 'MULTIPLE_PROFILES',
      message: 'Se encontraron múltiples perfiles activos. Contacte al administrador.'
    }, { status: 409 });
  }

  const profile = profiles[0];

  // Validar campos REQUIRED_FIELDS_FOR_OPERATION
  const REQUIRED_FIELDS = [
    'legal_name', 'commercial_name', 'email_main',
    'document_prefix_quote', 'document_prefix_sale',
    'quote_validity_days'
  ];

  const missingFields = REQUIRED_FIELDS.filter(f => !profile[f]);

  return Response.json({
    profile,
    is_complete: missingFields.length === 0,
    missing_fields: missingFields
  });
});