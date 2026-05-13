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
  { key: "admin_contenido_lineal", label: "ADMINISTRACIÓN DE CONTENIDO LINEAL", orden: 1 },
  { key: "admin_paquetes_tv_premium", label: "ADMINISTRACIÓN DE PAQUETES DE TV (CONTENIDO PREMIUM)", orden: 2 },
  { key: "control_parental", label: "CONTROL PARENTAL", orden: 3 },
  { key: "admin_usuarios", label: "ADMINISTRACIÓN DE USUARIOS", orden: 4 },
  { key: "app_deco_stb_android", label: "APLICACIÓN PARA DECO STB ANDROID (TV BOX) HOMOLOGADO", orden: 5 },
  { key: "integracion_deco_stb_linux", label: "INTEGRACIÓN PARA DECO STB LINUX", orden: 6 },
  { key: "app_android_smart_tv", label: "APLICACIÓN ANDROID PARA SMART TV", orden: 7 },
  { key: "app_tv_lg", label: "APLICACIÓN PARA TV LG", orden: 8 },
  { key: "app_tv_samsung", label: "APLICACIÓN PARA TV SAMSUNG", orden: 9 },
  { key: "app_telefonos_android", label: "APLICACIÓN TELÉFONOS ANDROID", orden: 10 },
  { key: "app_telefonos_iphone", label: "APLICACIÓN TELÉFONOS IPHONE**", orden: 11 },
  { key: "app_windows", label: "APLICACIÓN WINDOWS**", orden: 12 },
  { key: "app_mac", label: "APLICACIÓN MAC**", orden: 13 },
  { key: "epg", label: "GUÍA ELECTRÓNICA DE PROGRAMACIÓN (EPG)**", orden: 14 },
  { key: "reportes_sistema_estadisticas", label: "REPORTES DEL SISTEMA & ESTADÍSTICAS DE USO", orden: 15 },
  { key: "solucion_multi_cdn", label: "SOLUCIÓN MULTI - CDN", orden: 16 },
  { key: "ingenieria_red_head_end", label: "INGENIERÍA DE RED - HEAD END", orden: 17 },
  { key: "sucursal", label: "SUCURSAL", orden: 18 },
  { key: "integracion_otros_sistemas", label: "INTEGRACIÓN CON OTROS SISTEMAS", orden: 19 },
  { key: "portal_autogestion", label: "PORTAL AUTOGESTIÓN DE CLIENTES", orden: 20 },
  { key: "multiplan", label: "MULTIPLAN", orden: 21 },
  { key: "restriccion_ip", label: "RESTRICCIÓN POR IP", orden: 22 },
  { key: "landing_multiempresas", label: "LANDING PAGE MULTIEMPRESAS", orden: 23 },
  { key: "fail_over_streaming", label: "FAIL OVER STREAMING", orden: 24 },
  { key: "fail_over_cdn_cloud", label: "FAIL OVER CDN CLOUD", orden: 25 },
  { key: "channel_cloud", label: "CHANNEL CLOUD", orden: 26 },
  { key: "acceso_contenido", label: "ACCESO A CONTENIDO", orden: 27 },
  { key: "transporte_cabecera", label: "TRANSPORTE DE CABECERA", orden: 28 },
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
