/**
 * Utilidades de formateo para la aplicación de gestión administrativa.
 */

/**
 * Formatea un número como moneda con símbolo.
 * Para UF usa formato manual (Intl no soporta CLF en todos los browsers).
 */
export function formatCurrency(value: number, monedaValue = "USD"): string {
  if (isNaN(value)) return "$0.00";

  const currency = getCurrencyCode(monedaValue);

  // UF: formato manual "UF 1.234,56"
  if (currency === "UF") {
    const formatted = new Intl.NumberFormat("es-CL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return `UF ${formatted}`;
  }

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formatea un número con separadores de miles.
 */
export function formatNumber(value: number, decimals = 2): string {
  if (isNaN(value)) return "0";
  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formatea un porcentaje.
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

/**
 * Formatea una fecha en formato legible.
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    // Usar split para evitar el bug de timezone offset que resta 1 día.
    // new Date("2026-02-26") interpreta la fecha como UTC 00:00, y al
    // convertir a hora local (UTC-3, UTC-5, etc.) retrocede al día anterior.
    // Con split construimos la fecha en hora local directamente.
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) return dateStr;
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Parsea un string numérico a número, retorna 0 si inválido.
 */
export function parseNumeric(value: string | number): number {
  const n = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]/g, "")) : value;
  return isNaN(n) ? 0 : n;
}

/**
 * Calcula el total neto de una fila de costo.
 */
export function calcTotalNeto(valorNeto: number, cantidad: number): number {
  return valorNeto * cantidad;
}

/**
 * Calcula el total con IVA.
 */
export function calcTotal(totalNeto: number, iva: number): number {
  return totalNeto + iva;
}

/**
 * Extrae el código de moneda del valor del catálogo (ej: "USD-DÓLAR" → "USD", "UF-UF" → "UF").
 * Retorna "UF" para UF (no CLF) para que formatCurrency lo maneje con formato manual.
 * Si no se puede extraer, retorna "USD" por defecto.
 */
export function getCurrencyCode(monedaValue: string): string {
  if (!monedaValue) return "USD";
  const code = monedaValue.split("-")[0]?.toUpperCase();
  // UF: devolver "UF" directamente (formatCurrency lo maneja con formato manual)
  if (code === "UF") return "UF";
  // Mapear SOL → PEN
  if (code === "SOL") return "PEN";
  return code || "USD";
}

/**
 * Retorna el color de estado para badges.
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case "nuevo":      return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    case "borrador":   return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "guardado":   return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "completado": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "exportado":  return "bg-blue-50 text-blue-700 border-blue-200";
    default:           return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
}

/**
 * Retorna el label de estado.
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case "nuevo":      return "Nuevo";
    case "borrador":   return "Borrador";
    case "guardado":   return "Guardado";
    case "completado": return "Completado";
    case "exportado":  return "Exportado";
    default:           return status ?? "-";
  }
}
