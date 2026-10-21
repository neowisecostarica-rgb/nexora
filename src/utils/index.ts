/**
 * NEXORA — MAPA PARA DESARROLLADORES
 * Propósito: Utilidades exportadas para rutas; preservar contratos de consumidores.
 * Datos/efectos detectados: Sin acceso directo SDK a entidades detectado.
 * Dependencias: Revisar imports y consumidores; sin invoke literal detectado.
 * Límites: Preservar contratos; ver docs/NEXORA-REGRESSION-MATRIX.md. Runtime no certificado.
 * Referencia: docs/NEXORA-INVENTORY.md (base 54e8532).
 */
export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}