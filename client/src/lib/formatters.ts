/**
 * Utilidades de formateo para la aplicación de gestión administrativa.
 */

/**
 * Formatea un número como moneda con símbolo.
 */
export function formatCurrency(value: number, monedaValue = "USD"): string { // <-- 1. Cambiamos el nombre del parámetro para ser claros
  if (isNaN(value)) return "$0.00";

  // 2. Usamos tu función getCurrencyCode aquí para limpiar "USD-DÓLAR"
  const currency = getCurrencyCode(monedaValue);

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency, // <-- 3. Usamos el código limpio (ISO)
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
 * Extrae el código ISO de moneda del valor del catálogo (ej: "USD-DÓLAR" → "USD").
 * Si no se puede extraer, retorna "USD" por defecto.
 */
export function getCurrencyCode(monedaValue: string): string {
  if (!monedaValue) return "USD";
  const code = monedaValue.split("-")[0]?.toUpperCase();
  // Mapear UF → CLF (código ISO de la UF chilena)
  if (code === "UF") return "CLF";
  // Mapear SOL → PEN
  if (code === "SOL") return "PEN";
  return code || "USD";
}

/**
 * Retorna el color de estado para badges.
 */
export function getStatusColor(status: "borrador" | "completado" | "exportado"): string {
  switch (status) {
    case "borrador": return "bg-amber-50 text-amber-700 border-amber-200";
    case "completado": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "exportado": return "bg-blue-50 text-blue-700 border-blue-200";
    default: return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

/**
 * Retorna el label de estado.
 */
export function getStatusLabel(status: "borrador" | "completado" | "exportado"): string {
  switch (status) {
    case "borrador": return "Borrador";
    case "completado": return "Completado";
    case "exportado": return "Exportado";
    default: return status;
  }
}
