/** UI-only diagnostics; never bypass authentication or retry raw SDK access. */
export function organizationContextMessage(error) {
 const status=Number(error?.response?.status || error?.status || 0);
 const raw=String(error?.response?.data?.error || error?.code || error?.message || '');
 if(status===401 || raw.includes('UNAUTHORIZED')) return 'La sesión no está autorizada. Iniciá sesión nuevamente.';
 if(status===403 || raw.includes('OWNER_ACCESS_REQUIRED') || raw.includes('NO_ORGANIZATION_ACCESS')) return 'La cuenta no tiene acceso a una empresa autorizada.';
 if(status===404 || raw.includes('404')) return 'No se encontró el servicio de empresas en esta versión.';
 return 'No fue posible cargar las empresas. Revisá la conexión o el servicio.';
}
export function assertOrganizationContext(result) {
 if(!result || !Array.isArray(result.organizations)) throw new Error('INVALID_ORGANIZATION_CONTEXT');
 return result;
}
