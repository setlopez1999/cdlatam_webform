-- Índices audit_log para consultas filtradas (columnas base ya existen tras 0006).
-- Columnas expedienteUuid / expedienteCodigo e índice idx_audit_log_expediente_uuid:
-- se aplican en server/db.ts runMigrations Paso 2 (tryAlter idempotente).
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_audit_log_created_at` ON `audit_log` (`createdAt`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_audit_log_user_created` ON `audit_log` (`userId`, `createdAt`);
