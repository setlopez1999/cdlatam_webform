import multer from "multer";
import { mkdirSync } from "fs";
import { join } from "path";

// Carpeta de destino para PDFs de cláusulas
const uploadDir = join(process.cwd(), "data", "clauses");
mkdirSync(uploadDir, { recursive: true });

// Configuración de multer
export const uploadClausulas = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
    files: 1, // solo un archivo a la vez
  },
  fileFilter: (_req, file, cb) => {
    // Solo aceptar PDFs
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos PDF"));
    }
  },
});

// Función para mover el archivo al nombre final (usando nanoid o similar)
import { nanoid } from "nanoid";
import { renameSync } from "fs";

export function moveToFinalPath(tempPath: string, originalName: string): string {
  const ext = originalName.split(".").pop() || "pdf";
  const finalName = `${nanoid()}.${ext}`;
  const finalPath = join(uploadDir, finalName);
  renameSync(tempPath, finalPath);
  return finalName; // devolvemos solo el nombre, la ruta relativa será /clauses/nombre.pdf
}
