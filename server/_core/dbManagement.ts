import express, { type Express, type Request, type Response } from "express";
import { existsSync, writeFileSync } from "fs";
import { resolveDbPath } from "./dbConfig";
import { closeDb, initDb, getRawDb } from "../db";
import { ensureAllProjectTables } from "../schemaBootstrap";

/**
 * Registra rutas para la gestión manual del archivo de base de datos SQLite.
 * Útil para copias de seguridad rápidas y restauración manual.
 */
export function registerDbManagementRoutes(app: Express) {
  // Exportar (Descargar) la base de datos
  app.get("/api/db/export", (_req: Request, res: Response) => {
    const dbPath = resolveDbPath();
    if (!existsSync(dbPath)) {
      return res.status(404).json({ error: "Archivo de base de datos no encontrado." });
    }

    console.log("[DB Mgmt] Exporting database...");
    res.download(dbPath, "gestion_backup.db", (err) => {
      if (err) {
        console.error("[DB Mgmt] Error exporting database:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error al exportar la base de datos." });
        }
      }
    });
  });

  // Importar (Sobrescribir) la base de datos
  // Usamos body-parser raw para recibir el archivo binario directamente
  app.post("/api/db/import", express.raw({ type: "application/octet-stream", limit: "100mb" }), (req: Request, res: Response) => {
    try {
      console.log("[DB Mgmt] Receiving database import...");

      if (!req.body || req.body.length === 0) {
        return res.status(400).json({ error: "No se recibieron datos." });
      }

      const dbPath = resolveDbPath();

      // Cerrar la conexión activa para liberar el bloqueo del archivo
      closeDb();

      // Sobrescribir el archivo de base de datos
      writeFileSync(dbPath, Buffer.from(req.body));

      // Reabrir conexión con el nuevo archivo y asegurar que todas las tablas existen
      initDb();
      ensureAllProjectTables(getRawDb());

      console.log("[DB Mgmt] Database imported and reconnected successfully.");
      res.json({ success: true, message: "Base de datos importada correctamente. Se recomienda refrescar la página." });
    } catch (error) {
      console.error("[DB Mgmt] Error importing database:", error);
      // Intentar reabrir la conexión incluso si falló la importación
      try { initDb(); } catch { /* ignorar */ }
      res.status(500).json({ error: "Error al importar la base de datos." });
    }
  });
}
