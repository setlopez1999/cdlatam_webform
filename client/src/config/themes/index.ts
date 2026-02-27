/**
 * config/themes/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tokens de diseño centralizados para CD Latam.
 * Los valores aquí deben coincidir con las variables CSS en index.css.
 *
 * Uso en componentes:
 *   import { BRAND } from "@/config/themes";
 *   <div className={BRAND.primaryBg}>...</div>
 */

export const BRAND = {
  /** Nombre de la empresa */
  name: "CD Latam",
  /** Subtítulo del sistema */
  subtitle: "Plataforma de Gestión Documental",

  // ── Colores primarios (deben coincidir con CSS vars en index.css) ──────────
  primaryBg:    "bg-[#0A2463]",       // Azul marino CD Latam
  primaryText:  "text-[#0A2463]",
  accentBg:     "bg-[#E63946]",       // Rojo corporativo
  accentText:   "text-[#E63946]",
  secondaryBg:  "bg-[#1E3A8A]",       // Azul medio
  secondaryText:"text-[#1E3A8A]",

  // ── Superficies ────────────────────────────────────────────────────────────
  surfaceDark:  "#0D1B2A",            // Fondo principal oscuro
  surfaceCard:  "#112240",            // Cards
  surfaceBorder:"rgba(255,255,255,0.08)",

  // ── Gradientes ─────────────────────────────────────────────────────────────
  gradientPrimary: "from-[#0A2463] to-[#1E3A8A]",
  gradientAccent:  "from-[#E63946] to-[#C1121F]",
} as const;

export const TYPOGRAPHY = {
  fontFamily: "'Inter', 'Montserrat', sans-serif",
  heading:    "font-bold tracking-tight",
  body:       "font-normal leading-relaxed",
  mono:       "font-mono",
} as const;

export const SPACING = {
  sidebarWidth: "260px",
  headerHeight: "64px",
  cardRadius:   "12px",
} as const;
