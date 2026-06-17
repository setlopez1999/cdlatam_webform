/**
 * Logo corporativo servido desde `client/public/assets/`.
 * Usa import.meta.env.BASE_URL para respetar el base path de Vite (/sga/ en producción, / en dev).
 */
const BASE = import.meta.env.BASE_URL ?? "/";
export const CDLATAM_LOGO_PATH = `${BASE}assets/cdlatam-logo.png`;
export const CDLATAM_LOGO_COLLAPSE_PATH = `${BASE}assets/cdlatam-collapse.png`;

/** URL absoluta; útil para fetch, jsPDF y `<img>` dentro de iframes (p. ej. impresión F2). */
export function cdlatamLogoAbsoluteUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(CDLATAM_LOGO_PATH, window.location.origin).href;
  }
  return CDLATAM_LOGO_PATH;
}
