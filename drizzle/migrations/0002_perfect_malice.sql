CREATE TABLE `catalog_preventa` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_preventa_valor_unique` ON `catalog_preventa` (`valor`);