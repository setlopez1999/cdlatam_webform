CREATE TABLE `catalog_cecos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(10) NOT NULL,
	`empresa` varchar(20) NOT NULL,
	`departamento` varchar(200) NOT NULL,
	`nombreCompleto` varchar(300) NOT NULL,
	`activo` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalog_cecos_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_cecos_codigo_unique` UNIQUE(`codigo`)
);
--> statement-breakpoint
CREATE TABLE `catalog_contactos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(200) NOT NULL,
	`empresa` varchar(200),
	`activo` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalog_contactos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `catalog_detalle_servicio` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(200) NOT NULL,
	`activo` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalog_detalle_servicio_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_detalle_servicio_nombre_unique` UNIQUE(`nombre`)
);
--> statement-breakpoint
CREATE TABLE `catalog_documentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(20) NOT NULL,
	`activo` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalog_documentos_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_documentos_nombre_unique` UNIQUE(`nombre`)
);
--> statement-breakpoint
CREATE TABLE `catalog_monedas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(20) NOT NULL,
	`nombre` varchar(100) NOT NULL,
	`activo` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalog_monedas_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_monedas_codigo_unique` UNIQUE(`codigo`)
);
--> statement-breakpoint
CREATE TABLE `catalog_paises` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(100) NOT NULL,
	`activo` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalog_paises_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_paises_nombre_unique` UNIQUE(`nombre`)
);
--> statement-breakpoint
CREATE TABLE `catalog_plazos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(50) NOT NULL,
	`activo` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalog_plazos_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_plazos_nombre_unique` UNIQUE(`nombre`)
);
--> statement-breakpoint
CREATE TABLE `catalog_soluciones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(200) NOT NULL,
	`activo` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalog_soluciones_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_soluciones_nombre_unique` UNIQUE(`nombre`)
);
--> statement-breakpoint
CREATE TABLE `catalog_tipo_venta` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(100) NOT NULL,
	`activo` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalog_tipo_venta_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_tipo_venta_nombre_unique` UNIQUE(`nombre`)
);
--> statement-breakpoint
CREATE TABLE `catalog_unidades_negocio` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(150) NOT NULL,
	`activo` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catalog_unidades_negocio_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_unidades_negocio_nombre_unique` UNIQUE(`nombre`)
);
