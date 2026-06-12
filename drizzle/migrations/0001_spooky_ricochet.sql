CREATE TABLE `actas` (
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
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`expedienteId`) REFERENCES `expedientes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `actas_expedienteId_unique` ON `actas` (`expedienteId`);--> statement-breakpoint
CREATE UNIQUE INDEX `actas_nro_acta_unique` ON `actas` (`nro_acta`);--> statement-breakpoint
CREATE UNIQUE INDEX `actas_codigo_unique` ON `actas` (`codigo`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer,
	`username` text NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entityId` integer,
	`expedienteId` integer,
	`actaCodigo` text,
	`changes` text,
	`ip` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `catalog_areas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_areas_valor_unique` ON `catalog_areas` (`valor`);--> statement-breakpoint
CREATE TABLE `catalog_cecos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_cecos_valor_unique` ON `catalog_cecos` (`valor`);--> statement-breakpoint
CREATE TABLE `catalog_clausulas` (
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
--> statement-breakpoint
CREATE TABLE `catalog_consideraciones_comerciales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`orden` integer DEFAULT 0 NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL,
	`persistente` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `catalog_departamentos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_departamentos_valor_unique` ON `catalog_departamentos` (`valor`);--> statement-breakpoint
CREATE TABLE `catalog_detalle_servicio` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`solucionId` integer,
	`activo` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`solucionId`) REFERENCES `catalog_soluciones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_detalle_servicio_valor_unique` ON `catalog_detalle_servicio` (`valor`);--> statement-breakpoint
CREATE TABLE `catalog_documento_identidad` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_documento_identidad_valor_unique` ON `catalog_documento_identidad` (`valor`);--> statement-breakpoint
CREATE TABLE `catalog_documentos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_documentos_valor_unique` ON `catalog_documentos` (`valor`);--> statement-breakpoint
CREATE TABLE `catalog_empresas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_empresas_valor_unique` ON `catalog_empresas` (`valor`);--> statement-breakpoint
CREATE TABLE `catalog_implementacion_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`orden` integer DEFAULT 0 NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_implementacion_items_key_unique` ON `catalog_implementacion_items` (`key`);--> statement-breakpoint
CREATE TABLE `catalog_meta` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_name` text NOT NULL,
	`title` text NOT NULL,
	`is_custom` integer DEFAULT 0 NOT NULL,
	`linked_field` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_meta_table_name_unique` ON `catalog_meta` (`table_name`);--> statement-breakpoint
CREATE TABLE `catalog_monedas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_monedas_valor_unique` ON `catalog_monedas` (`valor`);--> statement-breakpoint
CREATE TABLE `catalog_nombres` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `catalog_paises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_paises_valor_unique` ON `catalog_paises` (`valor`);--> statement-breakpoint
CREATE TABLE `catalog_plazos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_plazos_valor_unique` ON `catalog_plazos` (`valor`);--> statement-breakpoint
CREATE TABLE `catalog_soluciones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`unidadNegocioId` integer,
	`activo` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`unidadNegocioId`) REFERENCES `catalog_unidades_negocio`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_soluciones_valor_unique` ON `catalog_soluciones` (`valor`);--> statement-breakpoint
CREATE TABLE `catalog_tipo_venta` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_tipo_venta_valor_unique` ON `catalog_tipo_venta` (`valor`);--> statement-breakpoint
CREATE TABLE `catalog_unidades_negocio` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_unidades_negocio_valor_unique` ON `catalog_unidades_negocio` (`valor`);--> statement-breakpoint
CREATE TABLE `evaluaciones` (
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
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`expedienteId`) REFERENCES `expedientes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `evaluaciones_expedienteId_unique` ON `evaluaciones` (`expedienteId`);--> statement-breakpoint
CREATE TABLE `expedientes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`creadorId` integer NOT NULL,
	`status` text DEFAULT 'borrador' NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `implementaciones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`expedienteId` integer NOT NULL,
	`checkKey` text NOT NULL,
	`estado` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`expedienteId`) REFERENCES `expedientes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `implementaciones_expedienteId_checkKey_unique` ON `implementaciones` (`expedienteId`,`checkKey`);--> statement-breakpoint
CREATE TABLE `resultados_expediente` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`expedienteId` integer NOT NULL,
	`payload` text NOT NULL,
	`f3FormStatus` text DEFAULT 'nuevo' NOT NULL,
	`f3SavedAt` integer,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`expedienteId`) REFERENCES `expedientes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resultados_expediente_expedienteId_unique` ON `resultados_expediente` (`expedienteId`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`label` text NOT NULL,
	`descripcion` text,
	`activo` integer DEFAULT 1 NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_nombre_unique` ON `roles` (`nombre`);--> statement-breakpoint
CREATE TABLE `sch_bloques_horario` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`contratoId` integer NOT NULL,
	`diaSemana` integer NOT NULL,
	`horaInicio` text NOT NULL,
	`horaFin` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sch_contratos` (
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
CREATE TABLE `sch_empleados` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`apellido` text NOT NULL,
	`cargo` text,
	`activo` integer DEFAULT 1 NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`roleId` integer NOT NULL,
	`assignedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
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
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);