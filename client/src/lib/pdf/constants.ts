// ─── Colores base de marca ───────────────────────────────────────────────────
export const LOGO_NATURAL_W_PX = 387;
export const LOGO_NATURAL_H_PX = 50;
export const BRAND_COLOR = "#00c2b2";
export const BRAND_DARK = "#009e90";
// Azul oscuro para el membrete (distinto del celeste de marca)
export const HEADER_BLUE_DARK = "#003d6b";
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
export const COLOR_HEADER_BLUE = hex(HEADER_BLUE_DARK);
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
// Usa azul oscuro (#003d6b) para el membrete, independiente del celeste de tablas/acentos
export const PDF_HEADER_COLOR: [number, number, number] = COLOR_HEADER_BLUE;

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

/**
 * drawGradientBand: dibuja una franja horizontal con degradado horizontal
 * interpolando entre colorFrom (izquierda) y colorTo (derecha).
 * Simula un degradado CSS dividiendo la franja en N tiras verticales delgadas.
 *
 * @param doc      instancia jsPDF
 * @param x        posición X inicial
 * @param y        posición Y inicial
 * @param w        ancho total de la franja
 * @param h        alto de la franja
 * @param from     color RGB izquierdo
 * @param to       color RGB derecho
 * @param steps    número de tiras (más = más suave, default 60)
 */
export function drawGradientBand(
  doc: import("jspdf").jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  from: [number, number, number],
  to: [number, number, number],
  steps = 60,
): void {
  const stepW = w / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const r = Math.round(from[0] + (to[0] - from[0]) * t);
    const g = Math.round(from[1] + (to[1] - from[1]) * t);
    const b = Math.round(from[2] + (to[2] - from[2]) * t);
    doc.setFillColor(r, g, b);
    // +0.5 de overlap para evitar líneas blancas entre tiras
    doc.rect(x + i * stepW, y, stepW + 0.5, h, "F");
  }
}

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
