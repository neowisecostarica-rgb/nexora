// SOT: Construye el organization_profile_snapshot versionado y controlado.
// Solo incluye campos necesarios para documentos comerciales.
// NUNCA guardar el objeto completo de OrganizationProfile.

export function buildOrgSnapshot(profile) {
  return {
    version: 1,
    commercial_name: profile.commercial_name || "",
    legal_name: profile.legal_name || "",
    logo_url: profile.logo_url || "",
    phone_main: profile.phone_main || "",
    email_main: profile.email_main || "",
    address_line: profile.address_line || "",
    city: profile.city || "",
    country: profile.country || "",
    payment_instructions: profile.payment_instructions || "",
    bank_details: profile.bank_details || "",
    sinpe_details: profile.sinpe_details || "",
    default_terms_conditions: profile.default_terms_conditions || "",
  };
}

// Campos REQUIRED para poder operar (crear cotizaciones/ventas)
export const REQUIRED_FIELDS_FOR_OPERATION = [
  { key: "legal_name", label: "Nombre Legal" },
  { key: "commercial_name", label: "Nombre Comercial" },
  { key: "email_main", label: "Email Principal" },
  { key: "document_prefix_quote", label: "Prefijo de Cotizaciones" },
  { key: "document_prefix_sale", label: "Prefijo de Ventas" },
  { key: "quote_validity_days", label: "Días de Validez de Cotización" },
];

export function validateProfileForOperation(profile) {
  if (!profile) return { valid: false, missing: REQUIRED_FIELDS_FOR_OPERATION.map(f => f.label) };
  const missing = REQUIRED_FIELDS_FOR_OPERATION
    .filter(f => !profile[f.key])
    .map(f => f.label);
  return { valid: missing.length === 0, missing };
}