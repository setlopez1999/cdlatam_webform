-- Migración 0010: Catálogo de plantillas para Consideraciones del Acta (F1)
-- Fecha: 2026-05-07
-- Descripción:
--   Tabla catalog_consideraciones_comerciales + seed de las 6 plantillas históricas.
-- Integridad: los valores del INSERT deben coincidir con
--   server/seeds/consideracionesComercialesSeed.ts (CATALOG_CONSIDERACIONES_COMERCIALES_SEED).

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `catalog_consideraciones_comerciales` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `valor` text NOT NULL,
  `orden` integer DEFAULT 0 NOT NULL,
  `activo` integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
INSERT OR IGNORE INTO catalog_consideraciones_comerciales (id, valor, orden, activo) VALUES
(1, 'Activación nueva.', 1, 1),
(2, 'Valores expresados en dólares.', 2, 1),
(3, 'Valores NO incluyen impuestos ni comisiones bancarias o de transferencia.', 3, 1),
(4, 'El servicio no incluye hardware.', 4, 1),
(5, 'Se considera un descuento del 50% en las dos primeras cuotas de mantención.', 5, 1),
(6, 'La forma de pago de la mantención es mes vencido a partir de la entrega del servicio.', 6, 1);
