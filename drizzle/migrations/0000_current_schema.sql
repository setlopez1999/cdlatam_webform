CREATE TABLE IF NOT EXISTS `roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`label` text NOT NULL DEFAULT '',
	`descripcion` text,
	`activo` integer DEFAULT 1 NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`passwordHash` text NOT NULL,
	`displayName` text,
	`role` text DEFAULT 'user' NOT NULL,
	`roleId` integer,
	`isActive` integer DEFAULT 1 NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`lastSignedIn` integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`roleId` integer NOT NULL,
	`assignedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `catalog_meta` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_name` text NOT NULL,
	`title` text NOT NULL,
	`is_custom` integer DEFAULT 0 NOT NULL,
	`linked_field` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `catalog_monedas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `catalog_paises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `catalog_empresas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `catalog_documento_identidad` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `catalog_unidades_negocio` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `catalog_soluciones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`unidadNegocioId` integer,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `catalog_detalle_servicio` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`solucionId` integer,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `catalog_tipo_venta` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `catalog_plazos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `catalog_documentos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `catalog_cecos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `catalog_departamentos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `catalog_areas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `catalog_nombres` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `catalog_consideraciones_comerciales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`orden` integer DEFAULT 0 NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL,
	`persistente` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `catalog_implementacion_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`orden` integer DEFAULT 0 NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `expedientes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`creadorId` integer NOT NULL,
	`status` text DEFAULT 'borrador' NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`deleted_at` integer DEFAULT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `actas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`expedienteId` integer NOT NULL,
	`nro_acta` integer,
	`codigo` text,
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
	`f1Datos` text,
	`f1FormStatus` text DEFAULT 'nuevo' NOT NULL,
	`f1SavedAt` integer,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `evaluaciones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`expedienteId` integer NOT NULL,
	`unidadNegocios` text,
	`empresa` text,
	`centroCostoHeader` text,
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
	`nombreFantasia` text,
	`hardware` text,
	`materiales` text,
	`rrhh` text,
	`otrosGastos` text,
	`totalHardware` real,
	`totalMateriales` real,
	`totalRrhh` real,
	`totalOtros` real,
	`totalGastos` real,
	`firmaImagen` text,
	`f2FormStatus` text DEFAULT 'nuevo' NOT NULL,
	`f2SavedAt` integer,
	`status` text DEFAULT 'borrador' NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sch_empleados` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`apellido` text NOT NULL,
	`cargo` text,
	`activo` integer DEFAULT 1 NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sch_contratos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`empleadoId` integer NOT NULL,
	`fechaInicio` text NOT NULL,
	`fechaFin` text,
	`horasDiarias` real NOT NULL,
	`diasSemana` text NOT NULL,
	`tipoDistribucion` text DEFAULT 'normal' NOT NULL,
	`mismasHorasDiarias` integer DEFAULT 1 NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sch_bloques_horario` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`contratoId` integer NOT NULL,
	`diaSemana` integer NOT NULL,
	`horaInicio` text NOT NULL,
	`horaFin` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resultados_expediente` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`expedienteId` integer NOT NULL,
	`payload` text NOT NULL,
	`f3FormStatus` text DEFAULT 'nuevo' NOT NULL,
	`f3SavedAt` integer,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `implementaciones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`expedienteId` integer NOT NULL,
	`checkKey` text NOT NULL,
	`estado` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer,
	`username` text NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entityId` integer,
	`expedienteId` integer,
	`expedienteCodigo` text,
	`changes` text,
	`ip` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `catalog_clausulas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`unidadNegocioId` integer,
	`filePath` text NOT NULL,
	`fileName` text NOT NULL,
	`fileSize` integer,
	`activo` integer DEFAULT 1 NOT NULL,
	`siempre_incluir` integer DEFAULT 0 NOT NULL,
	`tipo` text DEFAULT 'clausula' NOT NULL,
	`orden_global` integer DEFAULT 50 NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
