/**
 * rbac.ts — Role-Based Access Control (RBAC)
 *
 * Funciones de verificación de roles para usar en endpoints tRPC.
 * Consultan la tabla user_roles (N:N) como fuente de verdad.
 *
 * Uso en routers.ts:
 *   import { requireRole, requireAnyRole } from "./rbac";
 *
 *   .query(async ({ ctx }) => {
 *     await requireRole(ctx, "admin");
 *     // ... lógica protegida
 *   })
 *
 *   .query(async ({ ctx }) => {
 *     await requireAnyRole(ctx, ["admin", "gestor_horarios"]);
 *     // ... lógica protegida
 *   })
 */

import { TRPCError } from "@trpc/server";
import type { TrpcContext as Context } from "./_core/context";
import { userHasRole, userHasAnyRole } from "./db";

/**
 * Lanza TRPCError UNAUTHORIZED si el usuario no está autenticado.
 * Lanza TRPCError FORBIDDEN si el usuario no tiene el rol requerido.
 */
export async function requireRole(ctx: Context, roleName: string): Promise<void> {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
  }

  // Fallback: si el usuario tiene role="admin" en el campo legacy, siempre tiene acceso total
  if (ctx.user.role === "admin" && roleName === "admin") return;

  const hasIt = await userHasRole(ctx.user.id, roleName);
  if (!hasIt) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Acceso denegado: se requiere el rol '${roleName}'`,
    });
  }
}

/**
 * Lanza TRPCError UNAUTHORIZED si el usuario no está autenticado.
 * Lanza TRPCError FORBIDDEN si el usuario no tiene ninguno de los roles requeridos.
 */
export async function requireAnyRole(ctx: Context, roleNames: string[]): Promise<void> {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Debes iniciar sesión" });
  }

  // Fallback: admin legacy siempre tiene acceso total
  if (ctx.user.role === "admin") return;

  const hasIt = await userHasAnyRole(ctx.user.id, roleNames);
  if (!hasIt) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Acceso denegado: se requiere uno de los roles: ${roleNames.join(", ")}`,
    });
  }
}

/**
 * Verifica si el usuario autenticado tiene un rol (sin lanzar error).
 * Útil para lógica condicional dentro de un endpoint.
 */
export async function checkRole(ctx: Context, roleName: string): Promise<boolean> {
  if (!ctx.user) return false;
  if (ctx.user.role === "admin" && roleName === "admin") return true;
  return await userHasRole(ctx.user.id, roleName);
}

/**
 * Verifica si el usuario autenticado tiene alguno de los roles (sin lanzar error).
 */
export async function checkAnyRole(ctx: Context, roleNames: string[]): Promise<boolean> {
  if (!ctx.user) return false;
  if (ctx.user.role === "admin") return true;
  return await userHasAnyRole(ctx.user.id, roleNames);
}
