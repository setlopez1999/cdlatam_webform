/**
 * Checklist fijo «Implementación» IPTV-OTT por expediente.
 * Las claves son estables; el label puede ajustarse en código sin tocar filas en BD.
 */

export interface ImplementacionChecklistItem {
  readonly key: string;
  readonly orden: number;
  readonly label: string;
}

export const IMPLEMENTACION_IPTV_CHECKLIST: readonly ImplementacionChecklistItem[] = [
  { key: "admin_contenido_lineal", orden: 1, label: "ADMINISTRACIÓN DE CONTENIDO LINEAL" },
  { key: "admin_paquetes_tv_premium", orden: 2, label: "ADMINISTRACIÓN DE PAQUETES DE TV (CONTENIDO PREMIUM)" },
  { key: "control_parental", orden: 3, label: "CONTROL PARENTAL" },
  { key: "admin_usuarios", orden: 4, label: "ADMINISTRACIÓN DE USUARIOS" },
  { key: "app_deco_stb_android", orden: 5, label: "APLICACIÓN PARA DECO STB ANDROID (TV BOX) HOMOLOGADO" },
  { key: "integracion_deco_stb_linux", orden: 6, label: "INTEGRACIÓN PARA DECO STB LINUX" },
  { key: "app_android_smart_tv", orden: 7, label: "APLICACIÓN ANDROID PARA SMART TV" },
  { key: "app_tv_lg", orden: 8, label: "APLICACIÓN PARA TV LG" },
  { key: "app_tv_samsung", orden: 9, label: "APLICACIÓN PARA TV SAMSUNG" },
  { key: "app_telefonos_android", orden: 10, label: "APLICACIÓN TELÉFONOS ANDROID" },
  { key: "app_telefonos_iphone", orden: 11, label: "APLICACIÓN TELÉFONOS IPHONE**" },
  { key: "app_windows", orden: 12, label: "APLICACIÓN WINDOWS**" },
  { key: "app_mac", orden: 13, label: "APLICACIÓN MAC**" },
  { key: "epg", orden: 14, label: "GUÍA ELECTRÓNICA DE PROGRAMACIÓN (EPG)**" },
  { key: "reportes_sistema_estadisticas", orden: 15, label: "REPORTES DEL SISTEMA & ESTADÍSTICAS DE USO" },
  { key: "solucion_multi_cdn", orden: 16, label: "SOLUCIÓN MULTI - CDN" },
  { key: "ingenieria_red_head_end", orden: 17, label: "INGENIERÍA DE RED - HEAD END" },
  { key: "sucursal", orden: 18, label: "SUCURSAL" },
  { key: "integracion_otros_sistemas", orden: 19, label: "INTEGRACIÓN CON OTROS SISTEMAS" },
  { key: "portal_autogestion", orden: 20, label: "PORTAL AUTOGESTIÓN DE CLIENTES" },
  { key: "multiplan", orden: 21, label: "MULTIPLAN" },
  { key: "restriccion_ip", orden: 22, label: "RESTRICCIÓN POR IP" },
  { key: "landing_multiempresas", orden: 23, label: "LANDING PAGE MULTIEMPRESAS" },
  { key: "fail_over_streaming", orden: 24, label: "FAIL OVER STREAMING" },
  { key: "fail_over_cdn_cloud", orden: 25, label: "FAIL OVER CDN CLOUD" },
  { key: "channel_cloud", orden: 26, label: "CHANNEL CLOUD" },
  { key: "acceso_contenido", orden: 27, label: "ACCESO A CONTENIDO" },
  { key: "transporte_cabecera", orden: 28, label: "TRANSPORTE DE CABECERA" },
] as const;

const KEY_SET = new Set(IMPLEMENTACION_IPTV_CHECKLIST.map(i => i.key));

export function isValidImplementacionCheckKey(k: string): boolean {
  return KEY_SET.has(k);
}

export interface ImplementacionRowLike {
  checkKey: string;
  estado: number;
}

export interface ImplementacionItemVM {
  key: string;
  orden: number;
  label: string;
  estado: boolean;
}

/** Une catálogo fijo con filas guardadas; sin fila ⇒ estado false. */
export function mergeImplementacionList(rows: ImplementacionRowLike[]): ImplementacionItemVM[] {
  const map = new Map(rows.map(r => [r.checkKey, r.estado === 1]));
  return IMPLEMENTACION_IPTV_CHECKLIST.map(item => ({
    key: item.key,
    orden: item.orden,
    label: item.label,
    estado: map.get(item.key) ?? false,
  }));
}
