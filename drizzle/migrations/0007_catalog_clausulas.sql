-- Migración 0007: Tabla catalog_clausulas para PDFs de cláusulas legales
-- Fecha: 2026-05-04
-- Descripción:
--   Crea la tabla catalog_clausulas para almacenar metadatos de PDFs de cláusulas legales.
--   Soporta vínculo opcional con soluciones (catalog_soluciones).

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `catalog_clausulas` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `valor` text NOT NULL,
  `solucionId` integer,
  `filePath` text NOT NULL,
  `fileName` text NOT NULL,
  `fileSize` integer,
  `activo` integer DEFAULT 1 NOT NULL,
  `createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
