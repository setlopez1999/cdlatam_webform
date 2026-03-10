CREATE TABLE `actas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`noActa` text,
	`atencion` text,
	`fecha` integer,
	`razonSocial` text,
	`nombreFantasia` text,
	`rucDniRut` text,
	`direccionComercial` text,
	`representanteLegal` text,
	`representanteDni` text,
	`representanteEmail` text,
	`representanteFono` text,
	`contactoTecnico` text,
	`contactoTecnicoEmail` text,
	`contactoTecnicoFono` text,
	`contactoFacturacion` text,
	`contactoFacturacionEmail` text,
	`contactoFacturacionFono` text,
	`serviciosContratados` text,
	`formasPagoImplementacion` text,
	`formasPagoMantencion` text,
	`status` text DEFAULT 'borrador' NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `catalog_cecos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`codigo` text NOT NULL,
	`empresa` text NOT NULL,
	`departamento` text NOT NULL,
	`nombreCompleto` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_cecos_codigo_unique` ON `catalog_cecos` (`codigo`);--> statement-breakpoint
CREATE TABLE `catalog_contactos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`empresa` text,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `catalog_detalle_servicio` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_detalle_servicio_nombre_unique` ON `catalog_detalle_servicio` (`nombre`);--> statement-breakpoint
CREATE TABLE `catalog_documentos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_documentos_nombre_unique` ON `catalog_documentos` (`nombre`);--> statement-breakpoint
CREATE TABLE `catalog_monedas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`codigo` text NOT NULL,
	`nombre` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_monedas_codigo_unique` ON `catalog_monedas` (`codigo`);--> statement-breakpoint
CREATE TABLE `catalog_paises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_paises_nombre_unique` ON `catalog_paises` (`nombre`);--> statement-breakpoint
CREATE TABLE `catalog_plazos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_plazos_nombre_unique` ON `catalog_plazos` (`nombre`);--> statement-breakpoint
CREATE TABLE `catalog_soluciones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_soluciones_nombre_unique` ON `catalog_soluciones` (`nombre`);--> statement-breakpoint
CREATE TABLE `catalog_tipo_venta` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_tipo_venta_nombre_unique` ON `catalog_tipo_venta` (`nombre`);--> statement-breakpoint
CREATE TABLE `catalog_unidades_negocio` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_unidades_negocio_nombre_unique` ON `catalog_unidades_negocio` (`nombre`);--> statement-breakpoint
CREATE TABLE `evaluaciones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`actaId` integer,
	`unidadNegocios` text,
	`empresa` text,
	`solucion` text,
	`tipoMoneda` text,
	`montoProyecto` real,
	`tipoCambio` real,
	`totalClp` real,
	`descripcion` text,
	`preventa` text,
	`fechaEntrega` integer,
	`ejecutivoComercial` text,
	`plazoImplementacion` text,
	`propuestaNumero` text,
	`paisImplementacion` text,
	`rut` text,
	`nombreCliente` text,
	`hardware` text,
	`materiales` text,
	`rrhh` text,
	`otrosGastos` text,
	`totalHardware` real,
	`totalMateriales` real,
	`totalRrhh` real,
	`totalOtros` real,
	`totalGastos` real,
	`status` text DEFAULT 'borrador' NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `localUsers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`passwordHash` text NOT NULL,
	`displayName` text,
	`role` text DEFAULT 'user' NOT NULL,
	`isActive` integer DEFAULT 1 NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`lastSignedIn` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `localUsers_username_unique` ON `localUsers` (`username`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text NOT NULL,
	`name` text,
	`email` text,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`lastSignedIn` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);