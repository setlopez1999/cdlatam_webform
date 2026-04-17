/**
 * Utilidades centralizadas para manejo de errores en el cliente.
 *
 * APP_DEBUG se lee desde window.__ENV__ (inyectado por el servidor en /config.js)
 * en RUNTIME — no requiere rebuild para cambiar su valor.
 *
 * Para cambiar el modo debug:
 *   1. Editar APP_DEBUG en el .env del servidor
 *   2. docker-compose restart web  (NO necesita --build)
 */

declare global {
  interface Window {
    __ENV__?: {
      APP_DEBUG?: boolean;
    };
  }
}

/**
 * Lee APP_DEBUG desde window.__ENV__ (inyectado por el servidor en runtime).
 * Siempre lee desde el servidor — nunca desde el build.
 * Para cambiar: editar APP_DEBUG en .env y hacer docker-compose down && up (sin --build).
 */
export function getAppDebug(): boolean {
  if (typeof window !== "undefined" && window.__ENV__?.APP_DEBUG !== undefined) {
    return window.__ENV__.APP_DEBUG === true;
  }
  // Solo en SSR o entornos sin window, default false (seguro)
  return false;
}

export const APP_DEBUG = getAppDebug();

/**
 * Convierte cualquier error (tRPC, fetch, JSON parse, etc.) en un
 * mensaje legible para el usuario.
 *
 * - Si el mensaje contiene HTML (<!doctype) → "Error de conexión con el servidor"
 * - Si APP_DEBUG=true → muestra el mensaje técnico completo
 * - Si APP_DEBUG=false → muestra solo el tipo de error (401, 403, 500, etc.)
 */
export function parseErrorMessage(err: unknown): string {
  if (!err) return "Error desconocido";

  const debug = getAppDebug();
  const raw = err instanceof Error ? err.message : String(err);

  // El servidor devolvió HTML en vez de JSON (crash, Vite fallback, etc.)
  if (raw.includes("<!doctype") || raw.includes("<!DOCTYPE") || raw.includes("Unexpected token '<'")) {
    return debug
      ? "Error de conexión: el servidor devolvió HTML en vez de JSON. Revisa los logs del servidor."
      : "Error de conexión con el servidor. Intenta de nuevo.";
  }

  // Errores tRPC conocidos
  if (raw.includes("UNAUTHORIZED") || raw.includes("No autorizado")) {
    return "No tienes permiso para realizar esta acción.";
  }
  if (raw.includes("FORBIDDEN") || raw.includes("Acceso denegado")) {
    return "Acceso denegado.";
  }
  if (raw.includes("NOT_FOUND") || raw.includes("no encontrado")) {
    return "El recurso solicitado no existe.";
  }

  // En modo debug mostramos el mensaje técnico completo
  if (debug) return raw;

  // En modo producción mostramos un mensaje genérico
  return "Ocurrió un error. Intenta de nuevo o contacta al administrador.";
}

/**
 * Retorna true si el error es un problema de conexión/servidor
 * (para mostrar un ícono diferente en la UI).
 */
export function isConnectionError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  return (
    raw.includes("<!doctype") ||
    raw.includes("<!DOCTYPE") ||
    raw.includes("Unexpected token '<'") ||
    raw.includes("Failed to fetch") ||
    raw.includes("NetworkError")
  );
}
