/**
 * server/middleware/auth.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Middleware de autenticación y autorización para el servidor Express.
 *
 * Uso en routes:
 *   import { requireAuth, requireAdmin } from "../middleware/auth";
 *   router.get("/protected", requireAuth, handler);
 *   router.get("/admin-only", requireAuth, requireAdmin, handler);
 *
 * NOTA: Los procedimientos tRPC usan protectedProcedure/adminProcedure
 * definidos en server/_core/trpc.ts. Este middleware es para rutas REST
 * adicionales que se puedan agregar en el futuro.
 */

import type { Request, Response, NextFunction } from "express";
import { verifyLocalJWT } from "../localAuth";

// Extiende el tipo Request de Express para incluir el usuario autenticado
declare global {
  namespace Express {
    interface Request {
      localUser?: {
        id: number;
        username: string;
        role: "admin" | "user";
      };
    }
  }
}

/**
 * Verifica que el request tenga una sesión válida (JWT en cookie).
 * Si no está autenticado, responde con 401.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.["gestion_session"];
    if (!token) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    const payload = await verifyLocalJWT(token);
    if (!payload) {
      res.status(401).json({ error: "Sesión inválida o expirada" });
      return;
    }

    req.localUser = {
      id: Number(payload.id),
      username: payload.username,
      role: payload.role,
    };

    next();
  } catch {
    res.status(401).json({ error: "Error de autenticación" });
  }
}

/**
 * Verifica que el usuario autenticado tenga rol de administrador.
 * Debe usarse DESPUÉS de requireAuth.
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.localUser || req.localUser.role !== "admin") {
    res.status(403).json({ error: "Acceso denegado: se requiere rol admin" });
    return;
  }
  next();
}
