import express, { type Express, type Request, type Response } from "express";
import { existsSync, writeFileSync, mkdirSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";
import { resolveDbPath, isPostgresUrl } from "./dbConfig";
import { closeDb, initDb, getRawDb } from "../db";
import { ensureAllProjectTables } from "../schemaBootstrap";
import { verifyLocalJWT, findLocalUserById, LOCAL_AUTH_COOKIE } from "../localAuth";
import { userHasRole } from "../db";

/**
 * Middleware Express que verifica que el usuario autenticado tiene rol "admin".
 * Compatible con el sistema de autenticación local (JWT en cookie).
 */
async function requireAdminMiddleware(req: Request, res: Response, next: express.NextFunction) {
  try {
    // Extraer token de la cookie
    const cookieHeader = req.headers.cookie ?? "";
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${LOCAL_AUTH_COOKIE}=([^;]+)`));
    const token = match ? decodeURIComponent(match[1]) : null;

    if (!token) {
      return res.status(401).json({ error: "No autenticado. Debes iniciar sesión." });
    }

    const payload = await verifyLocalJWT(token);
    if (!payload) {
      return res.status(401).json({ error: "Sesión inválida o expirada." });
    }

    const user = await findLocalUserById(payload.id);
    if (!user || user.isActive !== 1) {
      return res.status(401).json({ error: "Usuario inactivo o no encontrado." });
    }

    // Verificar rol admin (campo legacy O tabla user_roles)
    const isAdmin = user.role === "admin" || await userHasRole(user.id, "admin");
    if (!isAdmin) {
      return res.status(403).json({
        error: "Acceso denegado. Se requiere rol de administrador para esta operación."
      });
    }

    // Adjuntar usuario a la request para uso posterior
    (req as any).adminUser = user;
    next();
  } catch (err) {
    console.error("[DB Mgmt] Error en autenticación:", err);
    res.status(500).json({ error: "Error interno al verificar permisos." });
  }
}

/**
 * Registra rutas para la gestión manual de la base de datos.
 * TODAS las rutas requieren rol "admin".
 *
 * Rutas:
 *   GET  /api/db/export  → Descarga backup de la BD (SQLite .db o PostgreSQL .sql)
 *   POST /api/db/import  → Importa/restaura la BD (solo SQLite, con backup previo)
 */
export function registerDbManagementRoutes(app: Express) {

  // ── EXPORT ─────────────────────────────────────────────────────────────────
  app.get("/api/db/export", requireAdminMiddleware, async (_req: Request, res: Response) => {
    const usePostgres = isPostgresUrl(process.env.DATABASE_URL);

    if (usePostgres) {
      // PostgreSQL: pg_dump
      const databaseUrl = process.env.DATABASE_URL!;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `sga_backup_${timestamp}.sql`;

      try {
        console.log("[DB Mgmt] Exportando PostgreSQL con pg_dump...");
        const dump = execSync(`pg_dump "${databaseUrl}" --no-password --clean --if-exists`, {
          maxBuffer: 200 * 1024 * 1024, // 200MB
          timeout: 120000,
        });
        res.setHeader("Content-Type", "application/sql");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.send(dump);
        console.log(`[DB Mgmt] Export PostgreSQL completado: ${filename}`);
      } catch (err: any) {
        console.error("[DB Mgmt] Error en pg_dump:", err.message);
        res.status(500).json({
          error: "Error al exportar PostgreSQL. Verifica que pg_dump esté disponible.",
          detail: err.message
        });
      }
    } else {
      // SQLite: descarga directa del archivo
      const dbPath = resolveDbPath();
      if (!existsSync(dbPath)) {
        return res.status(404).json({ error: "Archivo de base de datos no encontrado." });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `gestion_backup_${timestamp}.db`;
      console.log("[DB Mgmt] Exportando SQLite...");
      res.download(dbPath, filename, (err) => {
        if (err) {
          console.error("[DB Mgmt] Error exportando SQLite:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Error al exportar la base de datos." });
          }
        } else {
          console.log(`[DB Mgmt] Export SQLite completado: ${filename}`);
        }
      });
    }
  });

  // ── IMPORT ─────────────────────────────────────────────────────────────────
  app.post(
    "/api/db/import",
    requireAdminMiddleware,
    express.raw({ type: ["application/octet-stream", "application/sql", "text/plain"], limit: "200mb" }),
    async (req: Request, res: Response) => {
      const usePostgres = isPostgresUrl(process.env.DATABASE_URL);

      try {
        console.log("[DB Mgmt] Recibiendo importación de base de datos...");

        if (!req.body || req.body.length === 0) {
          return res.status(400).json({ error: "No se recibieron datos." });
        }

        if (usePostgres) {
          // PostgreSQL: restaurar con psql
          const databaseUrl = process.env.DATABASE_URL!;
          const tmpFile = `/tmp/sga_import_${Date.now()}.sql`;

          try {
            writeFileSync(tmpFile, Buffer.from(req.body));
            console.log("[DB Mgmt] Restaurando PostgreSQL con psql...");
            execSync(`psql "${databaseUrl}" --no-password -f "${tmpFile}"`, {
              timeout: 300000,
              maxBuffer: 200 * 1024 * 1024,
            });
            console.log("[DB Mgmt] Importación PostgreSQL completada.");
            res.json({
              success: true,
              message: "Base de datos PostgreSQL restaurada correctamente. Se recomienda refrescar la página."
            });
          } finally {
            try { execSync(`rm -f "${tmpFile}"`); } catch { /* ignorar */ }
          }
        } else {
          // SQLite: backup previo + sobrescritura
          const dbPath = resolveDbPath();

          // Crear backup automático antes de sobrescribir
          const backupDir = join(dirname(dbPath), "backups");
          mkdirSync(backupDir, { recursive: true });
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
          const backupPath = join(backupDir, `gestion_pre_import_${timestamp}.db`);

          if (existsSync(dbPath)) {
            copyFileSync(dbPath, backupPath);
            console.log(`[DB Mgmt] Backup previo creado en: ${backupPath}`);
          }

          // Cerrar conexión activa
          closeDb();

          // Sobrescribir archivo
          writeFileSync(dbPath, Buffer.from(req.body));

          // Reabrir conexión y verificar schema
          initDb();
          ensureAllProjectTables(getRawDb());

          console.log("[DB Mgmt] Importación SQLite completada.");
          res.json({
            success: true,
            message: "Base de datos importada correctamente. Backup previo guardado automáticamente. Se recomienda refrescar la página.",
            backupPath: backupPath
          });
        }
      } catch (error: any) {
        console.error("[DB Mgmt] Error importando base de datos:", error);
        // Intentar reabrir la conexión si falló
        if (!usePostgres) {
          try { initDb(); } catch { /* ignorar */ }
        }
        res.status(500).json({
          error: "Error al importar la base de datos.",
          detail: error?.message ?? String(error)
        });
      }
    }
  );
}
