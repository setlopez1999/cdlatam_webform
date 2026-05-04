import type { Express, Request } from "express";
import { uploadClausulas, moveToFinalPath } from "../multer-config";
import { ds_createClausula } from "../dataSource-clausulas";
import { verifyLocalJWT, findUserById, LOCAL_AUTH_COOKIE } from "../localAuth";
import { userHasRole } from "../db";
import { recordAuditDirect, getClientIp } from "../audit/record";

function extractLocalToken(req: Request): string | null {
  const cookieHeader = req.headers.cookie ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${LOCAL_AUTH_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function registerClausulasUpload(app: Express) {
  app.post(
    "/api/clausulas/upload",
    uploadClausulas.single("pdf"),
    async (req: any, res: any) => {
      try {
        const token = extractLocalToken(req);
        if (!token) {
          return res.status(401).json({ error: "Debes iniciar sesión" });
        }
        const payload = await verifyLocalJWT(token);
        if (!payload) {
          return res.status(401).json({ error: "Sesión inválida o expirada" });
        }
        const user = await findUserById(payload.id);
        if (!user || user.isActive !== 1) {
          return res.status(401).json({ error: "Usuario no válido" });
        }
        const isAdmin =
          user.role === "admin" || (await userHasRole(user.id, "admin"));
        if (!isAdmin) {
          return res.status(403).json({ error: "Solo administradores pueden subir cláusulas" });
        }

        if (!req.body || !req.file) {
          return res.status(400).json({ error: "Falta archivo o datos" });
        }

        const { valor, unidadNegocioId } = req.body;
        if (!valor) {
          return res.status(400).json({ error: "El nombre de la cláusula es requerido" });
        }

        // Mover archivo a ruta final
        const finalName = moveToFinalPath(req.file.path, req.file.originalname, valor);
        const filePath = `/clauses/${finalName}`;

        // Crear registro en BD
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
            userId: user.id,
            username: user.username,
            action: "UPLOAD",
            entity: "catalog_clausulas",
            entityId: row.id as number,
            ip: getClientIp(req),
            changes: {
              after: { valor, fileName: req.file.originalname, filePath },
            },
          });
        }

        return res.json({ success: true, data: newClausula });
      } catch (error: any) {
        console.error("[Upload Clausulas] Error:", error);
        return res.status(500).json({ error: error.message || "Error subiendo archivo" });
      }
    }
  );
}
