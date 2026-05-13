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

import { nanoid } from "nanoid";
import { renameSync } from "fs";

/** Nombre seguro para disco a partir del título de la cláusula (legible + único). */
function slugFromClauseName(name: string, maxLen = 48): string {
  const trimmed = name.trim().slice(0, 200);
  const ascii = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen)
    .replace(/-+$/g, "");
  return ascii.length >= 2 ? ascii : "clausula";
}

/**
 * Mueve el temporal de multer al nombre final.
 * Usa slug(título) + nanoid corto para que sea reconocible y sin colisiones.
 */
export function moveToFinalPath(
  tempPath: string,
  originalName: string,
  clauseTitle?: string
): string {
  // Solo PDF en este endpoint; extensión fija evita sorpresas en el slug.
  const ext = "pdf";
  const slug = clauseTitle ? slugFromClauseName(clauseTitle) : "clausula";
  const finalName = `${slug}-${nanoid(8)}.${ext}`;
  const finalPath = join(uploadDir, finalName);
  renameSync(tempPath, finalPath);
  return finalName;
}
