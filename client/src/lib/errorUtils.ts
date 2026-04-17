/**
 * Utilidades centralizadas para manejo de errores en el cliente.
 *
 * APP_DEBUG (VITE_APP_DEBUG=true en .env) controla si se muestran
 * detalles técnicos del error en la UI o solo mensajes genéricos.
 */

export const APP_DEBUG = import.meta.env.VITE_APP_DEBUG === "true";

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

  const raw = err instanceof Error ? err.message : String(err);

  // El servidor devolvió HTML en vez de JSON (crash, Vite fallback, etc.)
  if (raw.includes("<!doctype") || raw.includes("<!DOCTYPE") || raw.includes("Unexpected token '<'")) {
    return APP_DEBUG
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
  if (APP_DEBUG) return raw;

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
