/**
 * Seed inicial de `catalog_implementacion_items` (checklist Implementación IPTV-OTT).
 *
 * Integridad: los mismos valores están en `drizzle/migrations/0012_catalog_implementacion_items.sql`.
 * Si cambias textos u orden, actualiza ambos.
 */

export interface ImplementacionItemSeedRow {
  key: string;
  label: string;
  orden: number;
}

export const CATALOG_IMPLEMENTACION_ITEMS_SEED: readonly ImplementacionItemSeedRow[] = [
  { key: "integracion_deco_stb_linux", label: "INTEGRACIÓN PARA DECO STB LINUX", orden: 1 },
  { key: "ingenieria_red_head_end", label: "INGENIERÍA DE RED - HEAD END", orden: 2 },
  { key: "landing_multiempresas", label: "LANDING PAGE MULTIEMPRESAS", orden: 3 },
  { key: "fail_over_streaming", label: "FAIL OVER STREAMING", orden: 4 },
  { key: "fail_over_cdn_cloud", label: "FAIL OVER CDN CLOUD", orden: 5 },
  { key: "transporte_cabecera", label: "TRANSPORTE DE CABECERA", orden: 6 },
];

function escapeSqlSingleQuotes(val: string): string {
  return val.replace(/'/g, "''");
}

/** INSERT OR IGNORE idempotente (único por `key`). */
export function sqlSeedImplementacionItems(): string {
  const tuples = CATALOG_IMPLEMENTACION_ITEMS_SEED.map(
    r =>
      `('${escapeSqlSingleQuotes(r.key)}', '${escapeSqlSingleQuotes(r.label)}', ${r.orden}, 1)`,
  ).join(",\n");
  return `INSERT OR IGNORE INTO catalog_implementacion_items (\`key\`, label, orden, activo) VALUES\n${tuples};`;
}
