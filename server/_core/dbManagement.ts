import express, { type Express, type Request, type Response } from "express";
import { join, isAbsolute } from "path";
import { existsSync, writeFileSync } from "fs";

/**
 * Registra rutas para la gestión manual del archivo de base de datos SQLite.
 * Útil para copias de seguridad rápidas y restauración manual.
 */
export function registerDbManagementRoutes(app: Express) {
  // Misma lógica que db.ts: si DATABASE_URL es un path Docker/Linux (/app/...)
  // y estamos en Windows, lo ignoramos para evitar el ENOENT en C:\app\data\...
  const LOCAL_DB_PATH = join(process.cwd(), "gestion.db");
  let dbPath = LOCAL_DB_PATH;
  if (process.env.DATABASE_URL) {
    const envPath = process.env.DATABASE_URL.replace(/^file:/, "");
    const isLinuxPathOnWindows = process.platform === "win32" && envPath.startsWith("/app/");
    if (!isLinuxPathOnWindows) {
      dbPath = envPath;
    }
  }

  // Exportar (Descargar) la base de dato
  app.get("/api/db/export", (_req: Request, res: Response) => {
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

      // IMPORTANTE: Sobrescribir el archivo gestion.db
      // Esto puede causar problemas si la conexión está activa, 
      // pero SQLite suele manejarlo o el servidor se reiniciará por tsx watch.
      writeFileSync(dbPath, req.body);

      console.log("[DB Mgmt] Database imported successfully.");
      res.json({ success: true, message: "Base de datos importada correctamente. Se recomienda refrescar la página." });
    } catch (error) {
      console.error("[DB Mgmt] Error importing database:", error);
      res.status(500).json({ error: "Error al importar la base de datos." });
    }
  });
}
