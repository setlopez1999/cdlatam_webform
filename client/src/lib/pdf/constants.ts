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
