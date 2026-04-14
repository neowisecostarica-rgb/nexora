/**
 * CATEGORY CONFIG — Fuente única de verdad para configuración de categorías.
 * Para agregar una categoría nueva: solo agregar una entrada aquí.
 * NO duplicar esta lógica en ningún otro lugar.
 */
export const CategoryConfig = {
  laptops: {
    display_template: "{brand} {model} {cpu} {ram} {storage}",
    grouping_keys: ["brand", "model", "cpu", "ram", "storage", "condition"]
  },
  smartphones: {
    display_template: "{brand} {model} {storage} {color}",
    grouping_keys: ["brand", "model", "storage", "color", "condition"]
  },
  monitors: {
    display_template: "{brand} {model} {screen_size} {resolution}",
    grouping_keys: ["brand", "model", "screen_size", "resolution", "condition"]
  },
  sneakers: {
    display_template: "{brand} {model} {size} {color}",
    grouping_keys: ["brand", "model", "size", "color", "condition"]
  }
};

/**
 * buildDisplayName — Función genérica de interpolación.
 * Reemplaza {key} en el template con el valor correspondiente de attributes.
 * Si el key no existe en attributes, lo omite (string vacío).
 *
 * @param {string} template - Template de la categoría (ej. "{brand} {model} {cpu}")
 * @param {object} attributes - Objeto JSON con los atributos de la unidad
 * @returns {string} Nombre normalizado y limpio
 */
export function buildDisplayName(template, attributes) {
  return template
    .replace(/\{(\w+)\}/g, (_, key) => {
      return attributes[key] !== undefined && attributes[key] !== null
        ? String(attributes[key])
        : "";
    })
    .replace(/\s+/g, " ")
    .trim();
}