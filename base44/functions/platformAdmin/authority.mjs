/**
 * Propósito: identificar la autoridad de plataforma a partir de auth.me() del servidor.
 * Datos: identidad autenticada; sin escrituras. No aceptar user del cuerpo HTTP.
 * Regla: Gustavo es Super Admin; admin genérico y email aislado no autorizan.
 * Cambio de titular: requiere cambio revisado del ID fijado, no un toggle del navegador.
 */
export function isPlatformSuperAdmin(user) {
 return user?.id === '69d69fc4304f277844249dd7'
  && user?.role === 'admin'
  && typeof user?.email === 'string'
  && user.email.trim().toLowerCase() === 'gustavo.aguilar@gmail.com';
}
