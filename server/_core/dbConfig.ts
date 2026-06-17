import { join, dirname } from "path";
import { existsSync, mkdirSync } from "fs";

/**
 * Detecta si DATABASE_URL apunta a PostgreSQL.
 * Retorna true si DATABASE_URL comienza con "postgres://" o "postgresql://".
 *
 * En producción (VPS): DATABASE_URL=postgresql://sga_user:pass@localhost:5432/sga_db
 * En desarrollo local: DATABASE_URL=file:/app/data/gestion.db  (o vacío → SQLite local)
 */
export function isPostgresUrl(url?: string): boolean {
  if (!url) return false;
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

/**
 * Resuelve la ruta al archivo de base de datos SQLite.
 * Solo se llama cuando isPostgresUrl() retorna false.
 *
 * Orden de prioridad:
 * 1. DATABASE_URL si existe y NO es un path Linux (/app/) en Windows
 * 2. ./gestion.db (fallback local)
 *
 * En Docker con SQLite: DATABASE_URL=file:/app/data/gestion.db → /app/data/gestion.db
 * En Windows local: ignora /app/* → ./gestion.db
 */
export function resolveDbPath(): string {
  const LOCAL_DB_PATH = join(process.cwd(), "gestion.db");

  if (!process.env.DATABASE_URL) return LOCAL_DB_PATH;

  // Si es postgres, no debería llamarse esta función — pero por seguridad:
  if (isPostgresUrl(process.env.DATABASE_URL)) return LOCAL_DB_PATH;

  const envPath = process.env.DATABASE_URL.replace(/^file:/, "");
  const isLinuxPathOnWindows =
    process.platform === "win32" && envPath.startsWith("/app/");

  if (!isLinuxPathOnWindows) {
    const dbDir = dirname(envPath);
    if (!existsSync(dbDir)) {
      try {
        mkdirSync(dbDir, { recursive: true });
      } catch {
        console.warn(`[DB] No se pudo crear el directorio ${dbDir}, usando gestion.db local.`);
        return LOCAL_DB_PATH;
      }
    }
    return envPath;
  }

  return LOCAL_DB_PATH;
}
