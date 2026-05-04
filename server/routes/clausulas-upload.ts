import { uploadClausulas, moveToFinalPath } from "../multer-config";
import { ds_createClausula } from "../dataSource-clausulas";
import type { Express } from "express";

export function registerClausulasUpload(app: Express) {
  app.post(
    "/api/clausulas/upload",
    uploadClausulas.single("pdf"),
    async (req: express.Request, res: express.Response) => {
      try {
        // Verificar autenticación (asume que los middleware de sesión ya corrieron)
        if (!req.body || !req.file) {
          return res.status(400).json({ error: "Falta archivo o datos" });
        }

        const { valor, solucionId } = req.body;
        if (!valor) {
          return res.status(400).json({ error: "El nombre de la cláusula es requerido" });
        }

        // Mover archivo a ruta final
        const finalName = moveToFinalPath(req.file.path, req.file.originalname);
        const filePath = `/clauses/${finalName}`;

        // Crear registro en BD
        const newClausula = await ds_createClausula({
          valor,
          solucionId: solucionId ? parseInt(solucionId) : null,
          filePath,
          fileName: req.file.originalname,
          fileSize: req.file.size,
        });

        return res.json({ success: true, data: newClausula });
      } catch (error: any) {
        console.error("[Upload Clausulas] Error:", error);
        return res.status(500).json({ error: error.message || "Error subiendo archivo" });
      }
    }
  );
}
