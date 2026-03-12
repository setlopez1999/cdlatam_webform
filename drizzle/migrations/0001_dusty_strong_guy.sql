CREATE TABLE `catalog_areas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_areas_valor_unique` ON `catalog_areas` (`valor`);--> statement-breakpoint
CREATE TABLE `catalog_departamentos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_departamentos_valor_unique` ON `catalog_departamentos` (`valor`);--> statement-breakpoint
CREATE TABLE `catalog_documento_identidad` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_documento_identidad_valor_unique` ON `catalog_documento_identidad` (`valor`);--> statement-breakpoint
CREATE TABLE `catalog_empresas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_empresas_valor_unique` ON `catalog_empresas` (`valor`);--> statement-breakpoint
CREATE TABLE `catalog_nombres` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
DROP TABLE `catalog_contactos`;--> statement-breakpoint
DROP INDEX `catalog_cecos_codigo_unique`;--> statement-breakpoint
ALTER TABLE `catalog_cecos` ADD `valor` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_cecos_valor_unique` ON `catalog_cecos` (`valor`);--> statement-breakpoint
ALTER TABLE `catalog_cecos` DROP COLUMN `codigo`;--> statement-breakpoint
ALTER TABLE `catalog_cecos` DROP COLUMN `empresa`;--> statement-breakpoint
ALTER TABLE `catalog_cecos` DROP COLUMN `departamento`;--> statement-breakpoint
ALTER TABLE `catalog_cecos` DROP COLUMN `nombreCompleto`;--> statement-breakpoint
DROP INDEX `catalog_detalle_servicio_nombre_unique`;--> statement-breakpoint
ALTER TABLE `catalog_detalle_servicio` ADD `valor` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_detalle_servicio_valor_unique` ON `catalog_detalle_servicio` (`valor`);--> statement-breakpoint
ALTER TABLE `catalog_detalle_servicio` DROP COLUMN `nombre`;--> statement-breakpoint
DROP INDEX `catalog_documentos_nombre_unique`;--> statement-breakpoint
ALTER TABLE `catalog_documentos` ADD `valor` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_documentos_valor_unique` ON `catalog_documentos` (`valor`);--> statement-breakpoint
ALTER TABLE `catalog_documentos` DROP COLUMN `nombre`;--> statement-breakpoint
DROP INDEX `catalog_monedas_codigo_unique`;--> statement-breakpoint
ALTER TABLE `catalog_monedas` ADD `valor` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_monedas_valor_unique` ON `catalog_monedas` (`valor`);--> statement-breakpoint
ALTER TABLE `catalog_monedas` DROP COLUMN `codigo`;--> statement-breakpoint
ALTER TABLE `catalog_monedas` DROP COLUMN `nombre`;--> statement-breakpoint
DROP INDEX `catalog_paises_nombre_unique`;--> statement-breakpoint
ALTER TABLE `catalog_paises` ADD `valor` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_paises_valor_unique` ON `catalog_paises` (`valor`);--> statement-breakpoint
ALTER TABLE `catalog_paises` DROP COLUMN `nombre`;--> statement-breakpoint
DROP INDEX `catalog_plazos_nombre_unique`;--> statement-breakpoint
ALTER TABLE `catalog_plazos` ADD `valor` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_plazos_valor_unique` ON `catalog_plazos` (`valor`);--> statement-breakpoint
ALTER TABLE `catalog_plazos` DROP COLUMN `nombre`;--> statement-breakpoint
DROP INDEX `catalog_soluciones_nombre_unique`;--> statement-breakpoint
ALTER TABLE `catalog_soluciones` ADD `valor` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_soluciones_valor_unique` ON `catalog_soluciones` (`valor`);--> statement-breakpoint
ALTER TABLE `catalog_soluciones` DROP COLUMN `nombre`;--> statement-breakpoint
DROP INDEX `catalog_tipo_venta_nombre_unique`;--> statement-breakpoint
ALTER TABLE `catalog_tipo_venta` ADD `valor` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_tipo_venta_valor_unique` ON `catalog_tipo_venta` (`valor`);--> statement-breakpoint
ALTER TABLE `catalog_tipo_venta` DROP COLUMN `nombre`;--> statement-breakpoint
DROP INDEX `catalog_unidades_negocio_nombre_unique`;--> statement-breakpoint
ALTER TABLE `catalog_unidades_negocio` ADD `valor` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_unidades_negocio_valor_unique` ON `catalog_unidades_negocio` (`valor`);--> statement-breakpoint
ALTER TABLE `catalog_unidades_negocio` DROP COLUMN `nombre`;