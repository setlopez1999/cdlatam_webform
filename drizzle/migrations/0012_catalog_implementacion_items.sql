-- Migración 0012: Catálogo maestro de ítems Implementación IPTV-OTT
-- Fecha: 2026-05-07
-- Descripción:
--   Tabla catalog_implementacion_items + seed de los 28 ítems históricos.
-- Integridad: los valores del INSERT deben coincidir con
--   server/seeds/implementacionItemsSeed.ts (CATALOG_IMPLEMENTACION_ITEMS_SEED).

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `catalog_implementacion_items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `key` text NOT NULL,
  `label` text NOT NULL,
  `orden` integer DEFAULT 0 NOT NULL,
  `activo` integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `catalog_implementacion_items_key_unique` ON `catalog_implementacion_items` (`key`);

--> statement-breakpoint
INSERT OR IGNORE INTO catalog_implementacion_items (`key`, label, orden, activo) VALUES
('admin_contenido_lineal', 'ADMINISTRACIÓN DE CONTENIDO LINEAL', 1, 1),
('admin_paquetes_tv_premium', 'ADMINISTRACIÓN DE PAQUETES DE TV (CONTENIDO PREMIUM)', 2, 1),
('control_parental', 'CONTROL PARENTAL', 3, 1),
('admin_usuarios', 'ADMINISTRACIÓN DE USUARIOS', 4, 1),
('app_deco_stb_android', 'APLICACIÓN PARA DECO STB ANDROID (TV BOX) HOMOLOGADO', 5, 1),
('integracion_deco_stb_linux', 'INTEGRACIÓN PARA DECO STB LINUX', 6, 1),
('app_android_smart_tv', 'APLICACIÓN ANDROID PARA SMART TV', 7, 1),
('app_tv_lg', 'APLICACIÓN PARA TV LG', 8, 1),
('app_tv_samsung', 'APLICACIÓN PARA TV SAMSUNG', 9, 1),
('app_telefonos_android', 'APLICACIÓN TELÉFONOS ANDROID', 10, 1),
('app_telefonos_iphone', 'APLICACIÓN TELÉFONOS IPHONE**', 11, 1),
('app_windows', 'APLICACIÓN WINDOWS**', 12, 1),
('app_mac', 'APLICACIÓN MAC**', 13, 1),
('epg', 'GUÍA ELECTRÓNICA DE PROGRAMACIÓN (EPG)**', 14, 1),
('reportes_sistema_estadisticas', 'REPORTES DEL SISTEMA & ESTADÍSTICAS DE USO', 15, 1),
('solucion_multi_cdn', 'SOLUCIÓN MULTI - CDN', 16, 1),
('ingenieria_red_head_end', 'INGENIERÍA DE RED - HEAD END', 17, 1),
('sucursal', 'SUCURSAL', 18, 1),
('integracion_otros_sistemas', 'INTEGRACIÓN CON OTROS SISTEMAS', 19, 1),
('portal_autogestion', 'PORTAL AUTOGESTIÓN DE CLIENTES', 20, 1),
('multiplan', 'MULTIPLAN', 21, 1),
('restriccion_ip', 'RESTRICCIÓN POR IP', 22, 1),
('landing_multiempresas', 'LANDING PAGE MULTIEMPRESAS', 23, 1),
('fail_over_streaming', 'FAIL OVER STREAMING', 24, 1),
('fail_over_cdn_cloud', 'FAIL OVER CDN CLOUD', 25, 1),
('channel_cloud', 'CHANNEL CLOUD', 26, 1),
('acceso_contenido', 'ACCESO A CONTENIDO', 27, 1),
('transporte_cabecera', 'TRANSPORTE DE CABECERA', 28, 1);
