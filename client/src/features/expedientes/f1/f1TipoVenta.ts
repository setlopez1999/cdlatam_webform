/**
 * Clasificación de tipo de venta para F1 — Implementación vs Mantención.
 * Debe coincidir con la lógica de visibilidad en F1FormasPago.
 */

export const IMPLEMENTACION_KEYWORDS = ["implementacion", "implementación", "impl"];
export const MANTENCION_KEYWORDS = ["mantencion", "mantención", "mant", "mantención"];
export const IMPLEMENTACION_HITOS_KEYWORDS = ["implementacion hitos", "implementación hitos", "impl hitos", "hitos"];

export function matchesKeywords(value: string, keywords: string[]): boolean {
  const v = (value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return keywords.some(k => v.includes(k));
}

/** Prioridad a Implementación si ambos coincidieran (caso raro). */
export function categoriaPagoServicio(tipoVenta: string): "impl_hitos" | "impl" | "mant" | null {
  if (matchesKeywords(tipoVenta, IMPLEMENTACION_HITOS_KEYWORDS)) return "impl_hitos";
  if (matchesKeywords(tipoVenta, IMPLEMENTACION_KEYWORDS)) return "impl";
  if (matchesKeywords(tipoVenta, MANTENCION_KEYWORDS)) return "mant";
  return null;
}

export function isTipoImplementacion(tipoVenta: string): boolean {
  return categoriaPagoServicio(tipoVenta) === "impl";
}

export function isTipoMantencion(tipoVenta: string): boolean {
  return categoriaPagoServicio(tipoVenta) === "mant";
}

export function isTipoImplementacionHitos(tipoVenta: string): boolean {
  return categoriaPagoServicio(tipoVenta) === "impl_hitos";
}
