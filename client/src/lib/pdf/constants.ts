// ─── Dimensiones del logo original ───────────────────────────────────────────
export const LOGO_NATURAL_W_PX = 387;
export const LOGO_NATURAL_H_PX = 50;

// ─── Paleta de colores de marca ───────────────────────────────────────────────
export const BRAND_COLOR        = "#00c2b2"; // turquesa CDLatam
export const BRAND_DARK         = "#009e90"; // turquesa oscuro
export const HEADER_BLUE_DARK   = "#003d6b"; // azul oscuro membrete
export const HEADER_GRADIENT_END = "#0077a8"; // azul medio (extremo derecho del degradado)
export const TEXT_DARK          = "#0f2027"; // texto principal

export const hex = (h: string): [number, number, number] => {
  const m = h.replace("#", "");
  return [
    parseInt(m.slice(0, 2), 16),
    parseInt(m.slice(2, 4), 16),
    parseInt(m.slice(4, 6), 16),
  ];
};

export const COLOR_BRAND         = hex(BRAND_COLOR);
export const COLOR_BRAND_DARK    = hex(BRAND_DARK);
export const COLOR_HEADER_BLUE   = hex(HEADER_BLUE_DARK);
export const COLOR_GRADIENT_END  = hex(HEADER_GRADIENT_END);
export const COLOR_TEXT          = hex(TEXT_DARK);
export const COLOR_GRAY          = hex("#6b7280");
export const COLOR_LIGHT         = hex("#f3f4f6");

// ═══════════════════════════════════════════════════════════════════════════════
// ██  CONFIGURACIÓN VISUAL DE LOS PDFs — MODIFICAR AQUÍ PARA CAMBIAR ESTILOS  ██
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PDF_HEADER_COLOR
 * Color de fondo de la franja de membrete (Acta + Features).
 * Opciones rápidas:
 *   COLOR_HEADER_BLUE  → azul oscuro  #003d6b  (actual)
 *   COLOR_BRAND        → turquesa     #00c2b2
 *   COLOR_BRAND_DARK   → turquesa osc #009e90
 */
export const PDF_HEADER_COLOR: [number, number, number] = COLOR_HEADER_BLUE;

/**
 * PDF_HEADER_USE_GRADIENT
 * true  → membrete con degradado horizontal (PDF_HEADER_COLOR → PDF_HEADER_GRADIENT_END)
 * false → membrete color sólido (PDF_HEADER_COLOR)
 */
export const PDF_HEADER_USE_GRADIENT = false;

/**
 * PDF_HEADER_GRADIENT_END
 * Color del extremo derecho del degradado (solo aplica si PDF_HEADER_USE_GRADIENT = true).
 * Opciones rápidas:
 *   COLOR_GRADIENT_END → azul medio   #0077a8
 *   COLOR_BRAND        → turquesa     #00c2b2
 */
export const PDF_HEADER_GRADIENT_END: [number, number, number] = COLOR_GRADIENT_END;

/**
 * PDF_COLOR_GLOBAL
 * Color de cabeceras de tablas, líneas y acentos en TODOS los PDFs.
 * Para que todo sea del mismo color que el membrete → usar PDF_HEADER_COLOR.
 * Para el turquesa de marca → usar COLOR_BRAND.
 */
export const PDF_COLOR_GLOBAL: [number, number, number] = PDF_HEADER_COLOR;

/**
 * Colores derivados del color global — se calculan automáticamente.
 * NO modificar manualmente; cambian solos al cambiar PDF_COLOR_GLOBAL.
 *
 * PDF_COLOR_DARK    → versión oscura del color global (títulos de sección, textos)
 * PDF_COLOR_TINT    → fondo semitransparente (intro-box, fila total de tabla)
 * PDF_COLOR_LIGHT_TINT → fondo muy claro (intro-box fill)
 * PDF_COLOR_SUBTITLE   → texto secundario en membrete (casi blanco con tinte del color)
 */
export const PDF_COLOR_DARK: [number, number, number] = [
  Math.max(0, PDF_COLOR_GLOBAL[0] - 20),
  Math.max(0, PDF_COLOR_GLOBAL[1] - 20),
  Math.max(0, PDF_COLOR_GLOBAL[2] - 20),
];
export const PDF_COLOR_TINT: [number, number, number] = [
  Math.min(255, Math.round(PDF_COLOR_GLOBAL[0] * 0.15 + 240)),
  Math.min(255, Math.round(PDF_COLOR_GLOBAL[1] * 0.15 + 240)),
  Math.min(255, Math.round(PDF_COLOR_GLOBAL[2] * 0.15 + 240)),
];
export const PDF_COLOR_LIGHT_TINT: [number, number, number] = [
  Math.min(255, Math.round(PDF_COLOR_GLOBAL[0] * 0.08 + 245)),
  Math.min(255, Math.round(PDF_COLOR_GLOBAL[1] * 0.08 + 245)),
  Math.min(255, Math.round(PDF_COLOR_GLOBAL[2] * 0.08 + 245)),
];
export const PDF_COLOR_SUBTITLE: [number, number, number] = [
  Math.min(255, Math.round(PDF_COLOR_GLOBAL[0] * 0.3 + 178)),
  Math.min(255, Math.round(PDF_COLOR_GLOBAL[1] * 0.3 + 178)),
  Math.min(255, Math.round(PDF_COLOR_GLOBAL[2] * 0.3 + 178)),
];

// ═══════════════════════════════════════════════════════════════════════════════

/**
 * resolveHeaderColor: devuelve el color de membrete a usar.
 * Si se pasa un override puntual, ese tiene prioridad máxima.
 */
export function resolveHeaderColor(
  override?: [number, number, number],
): [number, number, number] {
  return override ?? PDF_HEADER_COLOR;
}

// ─── Logo de empresa en membrete del PDF ────────────────────────────────────
export const USAR_LOGO_EMPRESA = false;

// ─── Otros ───────────────────────────────────────────────────────────────────
export const FEATURES_RESUMIDO_ORDEN = 20;

/**
 * drawHeaderBand: dibuja el fondo de la franja del membrete.
 * Respeta PDF_HEADER_USE_GRADIENT automáticamente.
 * Usar en lugar de doc.rect() directamente para que el flag de degradado funcione.
 */
export function drawHeaderBand(
  doc: import("jspdf").jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  hColor: [number, number, number],
): void {
  if (PDF_HEADER_USE_GRADIENT) {
    drawGradientBand(doc, x, y, w, h, hColor, PDF_HEADER_GRADIENT_END);
  } else {
    doc.setFillColor(...hColor);
    doc.rect(x, y, w, h, "F");
  }
}

/**
 * drawGradientBand: simula degradado CSS con N tiras verticales interpoladas.
 * Llamar directamente solo si se necesita un degradado personalizado.
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
