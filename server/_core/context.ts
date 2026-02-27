import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifyLocalJWT, findLocalUserById, LOCAL_AUTH_COOKIE, type LocalAuthPayload } from "../localAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** Usuario autenticado con sistema local (username/password) */
  localUser: LocalAuthPayload | null;
};

/**
 * Extrae el token de la cookie local_session de la request.
 */
function extractLocalToken(req: CreateExpressContextOptions["req"]): string | null {
  const cookieHeader = req.headers.cookie ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${LOCAL_AUTH_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let localUser: LocalAuthPayload | null = null;

  // 1. Intentar autenticación local (username/password JWT)
  const localToken = extractLocalToken(opts.req);
  if (localToken) {
    const payload = await verifyLocalJWT(localToken);
    if (payload) {
      localUser = payload;
      // Construir un objeto User compatible para no romper protectedProcedure
      const dbUser = await findLocalUserById(payload.id);
      if (dbUser && dbUser.isActive === 1) {
        user = {
          id: dbUser.id,
          openId: `local_${dbUser.username}`,
          name: dbUser.displayName ?? dbUser.username,
          email: null,
          loginMethod: "local",
          role: dbUser.role,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
          lastSignedIn: dbUser.lastSignedIn ?? dbUser.createdAt,
        };
      }
    }
  }

  // 2. Si no hay sesión local, intentar OAuth de Manus (compatibilidad)
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    localUser,
  };
}
