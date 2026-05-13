-- Migración 0006: Vincular actas con expedientes y garantizar tablas expedientes + audit_log
-- Fecha: 2025-04-24
-- Descripción:
--   1. Agrega columna expedienteUuid a la tabla actas (vínculo con el store de Zustand)
--   2. Crea la tabla expedientes si no existe (metadata de expedientes)
--   3. Crea la tabla audit_log si no existe (trazabilidad de acciones)

--> statement-breakpoint
ALTER TABLE `actas` ADD COLUMN `expedienteUuid` text;

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `expedientes` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `uuid` text NOT NULL UNIQUE,
  `nombre` text NOT NULL,
  `creadorId` integer NOT NULL,
  `actaId` integer,
  `evaluacionId` integer,
  `status` text DEFAULT 'borrador' NOT NULL,
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
  `changes` text,
  `ip` text,
  `createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
