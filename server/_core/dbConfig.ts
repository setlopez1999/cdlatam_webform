import { join, dirname } from "path";
import { existsSync, mkdirSync } from "fs";

/**
 * Resuelve la ruta al archivo de base de datos SQLite.
 *
 * Orden de prioridad:
 * 1. DATABASE_URL si existe y NO es un path Linux (/app/) en Windows
 * 2. ./gestion.db (fallback local)
 *
 * En Docker: DATABASE_URL=file:/app/data/gestion.db → /app/data/gestion.db (volumen mapeado)
 * En Windows local: ignora /app/* → ./gestion.db
 */
export function resolveDbPath(): string {
  const LOCAL_DB_PATH = join(process.cwd(), "gestion.db");

  if (!process.env.DATABASE_URL) return LOCAL_DB_PATH;

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
