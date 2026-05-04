-- Contexto de expediente en auditoría + índices para consultas filtradas
ALTER TABLE `audit_log` ADD COLUMN `expedienteUuid` text;
--> statement-breakpoint
ALTER TABLE `audit_log` ADD COLUMN `expedienteCodigo` text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_audit_log_created_at` ON `audit_log` (`createdAt`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_audit_log_user_created` ON `audit_log` (`userId`, `createdAt`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_audit_log_expediente_uuid` ON `audit_log` (`expedienteUuid`);
