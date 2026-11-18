/**
 * Preferencia de interfaz para ocultar la entrada introductoria tras completar el recorrido.
 * No representa autorización, membresía, activación comercial ni certificación de QA.
 * Alcance: navegador + usuario autenticado + empresa seleccionada. No contiene datos sensibles.
 */
const PREFIX = "nexora.onboarding.dismissed.v1";
export const onboardingKey = userId => {
  const organizationId = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("nexora.organization") : null;
  if (!userId || !organizationId) return null;
  return `${PREFIX}:${userId}:${organizationId}`;
};
export const isOnboardingDismissed = userId => {
  const key = onboardingKey(userId);
  try { return !!key && localStorage.getItem(key) === "yes"; } catch { return false; }
};
export const dismissOnboarding = userId => {
  const key = onboardingKey(userId);
  if (!key) return false;
  try { localStorage.setItem(key, "yes"); window.dispatchEvent(new Event("nexora:onboarding-changed")); return true; } catch { return false; }
};
export const restoreOnboarding = userId => {
  const key = onboardingKey(userId);
  if (!key) return false;
  try { localStorage.removeItem(key); window.dispatchEvent(new Event("nexora:onboarding-changed")); return true; } catch { return false; }
};
