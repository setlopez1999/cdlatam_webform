-- Checklist Implementación IPTV-OTT por expediente
CREATE TABLE IF NOT EXISTS `implementaciones` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `expedienteId` integer NOT NULL REFERENCES `expedientes`(`id`) ON DELETE CASCADE,
  `checkKey` text NOT NULL,
  `estado` integer DEFAULT 0 NOT NULL,
  `createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
  `updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
  UNIQUE(`expedienteId`, `checkKey`)
);
