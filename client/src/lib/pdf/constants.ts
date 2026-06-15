// ─── Colores base de marca ───────────────────────────────────────────────────
export const LOGO_NATURAL_W_PX = 387;
export const LOGO_NATURAL_H_PX = 50;
export const BRAND_COLOR = "#00c2b2";
export const BRAND_DARK = "#009e90";
export const TEXT_DARK = "#0f2027";

export const hex = (h: string): [number, number, number] => {
  const m = h.replace("#", "");
  return [
    parseInt(m.slice(0, 2), 16),
    parseInt(m.slice(2, 4), 16),
    parseInt(m.slice(4, 6), 16),
  ];
};

export const COLOR_BRAND = hex(BRAND_COLOR);
export const COLOR_BRAND_DARK = hex(BRAND_DARK);
export const COLOR_TEXT = hex(TEXT_DARK);
export const COLOR_GRAY = hex("#6b7280");
export const COLOR_LIGHT = hex("#f3f4f6");

// ─── Color global del PDF ────────────────────────────────────────────────────
/**
 * PDF_COLOR_GLOBAL: color principal usado en tablas, líneas y acentos de TODOS
 * los PDFs. Cambiar aquí afecta toda la generación de PDFs del sistema.
 * Por defecto usa COLOR_BRAND (azul CDLatam).
 */
export const PDF_COLOR_GLOBAL: [number, number, number] = COLOR_BRAND;

// ─── Color de membrete ───────────────────────────────────────────────────────
/**
 * PDF_HEADER_COLOR: color específico de la franja de membrete (header).
 * Tiene PRIORIDAD sobre PDF_COLOR_GLOBAL para el fondo de la franja.
 * Si quieres cambiar solo el header sin tocar el resto del PDF, modifica
 * únicamente esta constante.
 * Por defecto usa PDF_COLOR_GLOBAL.
 */
export const PDF_HEADER_COLOR: [number, number, number] = PDF_COLOR_GLOBAL;

/**
 * resolveHeaderColor: devuelve el color de membrete a usar.
 * Si se pasa un color específico (override), ese tiene prioridad máxima.
 * Si no, usa PDF_HEADER_COLOR (que a su vez puede diferir de PDF_COLOR_GLOBAL).
 *
 * Uso:
 *   const headerColor = resolveHeaderColor();           // usa PDF_HEADER_COLOR
 *   const headerColor = resolveHeaderColor([255,0,0]);  // rojo solo para este PDF
 */
export function resolveHeaderColor(
  override?: [number, number, number],
): [number, number, number] {
  return override ?? PDF_HEADER_COLOR;
}

// ─── Otros ───────────────────────────────────────────────────────────────────
export const FEATURES_RESUMIDO_ORDEN = 20;

export function fitImagePreserveAspectMm(
  naturalW: number,
  naturalH: number,
  maxW: number,
  maxH: number,
): { drawW: number; drawH: number } {
  const ratio = naturalW / naturalH;
  let drawW = maxW;
  let drawH = maxW / ratio;
  if (drawH > maxH) {
    drawH = maxH;
    drawW = maxH * ratio;
  }
  return { drawW, drawH };
}
