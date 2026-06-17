import type { Express, Request } from "express";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";
import { uploadClausulas, moveToFinalPath } from "../multer-config";
import { ds_createClausula, ds_getClausulaById, ds_updateClausula } from "../dataSource-clausulas";
import { verifyLocalJWT, findUserById, LOCAL_AUTH_COOKIE } from "../localAuth";
import { userHasRole } from "../db";
import { recordAuditDirect, getClientIp } from "../audit/record";

function extractLocalToken(req: Request): string | null {
  const cookieHeader = req.headers.cookie ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${LOCAL_AUTH_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function verifyAdmin(req: Request): Promise<{ ok: true; userId: number; username: string } | { ok: false; status: number; error: string }> {
  const token = extractLocalToken(req);
  if (!token) return { ok: false, status: 401, error: "Debes iniciar sesión" };
  const payload = await verifyLocalJWT(token);
  if (!payload) return { ok: false, status: 401, error: "Sesión inválida o expirada" };
  const user = await findUserById(payload.id);
  if (!user || user.isActive !== 1) return { ok: false, status: 401, error: "Usuario no válido" };
  const isAdmin = await userHasRole(user.id, "admin");
  if (!isAdmin) return { ok: false, status: 403, error: "Solo administradores pueden modificar cláusulas" };
  return { ok: true, userId: user.id, username: user.username };
}

export function registerClausulasUpload(app: Express) {
  // ─── POST /api/clausulas/upload — Crear nueva cláusula ──────────────────────
  app.post(
    "/api/clausulas/upload",
    uploadClausulas.single("pdf"),
    async (req: any, res: any) => {
      try {
        const auth = await verifyAdmin(req);
        if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

        if (!req.body || !req.file) {
          return res.status(400).json({ error: "Falta archivo o datos" });
        }

        const { valor, unidadNegocioId } = req.body;
        if (!valor) {
          return res.status(400).json({ error: "El nombre de la cláusula es requerido" });
        }

        const finalName = moveToFinalPath(req.file.path, req.file.originalname, valor);
        const filePath = `/clauses/${finalName}`;

        const newClausula = await ds_createClausula({
          valor,
          unidadNegocioId: unidadNegocioId ? parseInt(unidadNegocioId) : null,
          filePath,
          fileName: req.file.originalname,
          fileSize: req.file.size,
        });
        const row = Array.isArray(newClausula) ? newClausula[0] : newClausula;
        if (row && typeof row === "object" && "id" in row) {
          await recordAuditDirect({
            userId: auth.userId,
            username: auth.username,
            action: "UPLOAD",
            entity: "catalog_clausulas",
            entityId: row.id as number,
            ip: getClientIp(req),
            changes: { after: { valor, fileName: req.file.originalname, filePath } },
          });
        }

        return res.json({ success: true, data: newClausula });
      } catch (error: any) {
        console.error("[Upload Clausulas] Error:", error);
        return res.status(500).json({ error: error.message || "Error subiendo archivo" });
      }
    }
  );

  // ─── POST /api/clausulas/replace/:id — Reemplazar PDF de cláusula existente ─
  app.post(
    "/api/clausulas/replace/:id",
    uploadClausulas.single("pdf"),
    async (req: any, res: any) => {
      try {
        const auth = await verifyAdmin(req);
        if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });

        if (!req.file) return res.status(400).json({ error: "Falta el archivo PDF" });

        // Obtener la cláusula existente para borrar el archivo anterior
        const existing = await ds_getClausulaById(id);
        if (!existing) return res.status(404).json({ error: "Cláusula no encontrada" });

        // Borrar el archivo anterior si existe en disco (solo archivos en data/clauses/)
        const oldRelPath = (existing as { filePath: string }).filePath;
        if (oldRelPath && oldRelPath.startsWith("/clauses/")) {
          const oldFileName = oldRelPath.replace("/clauses/", "");
          const oldAbsPath = join(process.cwd(), "data", "clauses", oldFileName);
          if (existsSync(oldAbsPath)) {
            try { unlinkSync(oldAbsPath); } catch { /* ignorar si falla */ }
          }
        }

        // Mover el nuevo archivo
        const clauseTitle = (existing as { valor: string }).valor;
        const finalName = moveToFinalPath(req.file.path, req.file.originalname, clauseTitle);
        const newFilePath = `/clauses/${finalName}`;

        // Actualizar registro en BD
        const updated = await ds_updateClausula(id, {
          filePath: newFilePath,
          fileName: req.file.originalname,
          fileSize: req.file.size,
        });

        await recordAuditDirect({
          userId: auth.userId,
          username: auth.username,
          action: "UPDATE",
          entity: "catalog_clausulas",
          entityId: id,
          ip: getClientIp(req),
          changes: {
            before: { filePath: oldRelPath, fileName: (existing as { fileName: string }).fileName },
            after: { filePath: newFilePath, fileName: req.file.originalname },
          },
        });

        return res.json({ success: true, data: updated });
      } catch (error: any) {
        console.error("[Replace Clausula] Error:", error);
        return res.status(500).json({ error: error.message || "Error reemplazando archivo" });
      }
    }
  );
}
