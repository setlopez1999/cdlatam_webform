/**
 * Logo corporativo servido desde `client/public/assets/` (Vite → `/assets/...`).
 * Origen histórico CDN (re-export manual si hace falta): Manus `FDtlcTtkjZpRheHR.png`.
 */
export const CDLATAM_LOGO_PATH = "/assets/cdlatam-logo.png";
export const CDLATAM_LOGO_COLLAPSE_PATH = "/assets/cdlatam-collapse.png";

/** URL absoluta; útil para fetch, jsPDF y `<img>` dentro de iframes (p. ej. impresión F2). */
export function cdlatamLogoAbsoluteUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(CDLATAM_LOGO_PATH, window.location.origin).href;
  }
  return CDLATAM_LOGO_PATH;
}
