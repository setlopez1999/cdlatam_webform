import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
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
      // Cargar el usuario desde la BD y asignarlo directamente al contexto
      const dbUser = await findLocalUserById(payload.id);
      if (dbUser && dbUser.isActive === 1) {
        user = dbUser;
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    localUser,
  };
}
