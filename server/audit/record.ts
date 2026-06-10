/**
 * Punto único recomendado para registrar auditoría desde handlers HTTP/tRPC.
 * Delega en createAuditLog (db.ts) y normaliza usuario + IP.
 */
import type { TrpcContext } from "../_core/context";
import { createAuditLog } from "../db";

export type AuditRecordInput = {
  action: string;
  entity: string;
  entityId?: number | null;
  expedienteId?: number | null;
  expedienteCodigo?: string | null;
  changes?: { before?: unknown; after?: unknown } | null;
  /** Si no se pasan, se toman de ctx.user / ctx.localUser */
  userId?: number | null;
  username?: string;
  ip?: string | null;
};

export function getClientIp(req: TrpcContext["req"]): string | undefined {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string") return xff.split(",")[0]?.trim() || undefined;
  if (Array.isArray(xff) && xff[0]) return String(xff[0]).split(",")[0]?.trim() || undefined;
  const raw = req.socket?.remoteAddress;
  return raw ? String(raw) : undefined;
}

function resolveActor(ctx: TrpcContext, override?: { userId?: number | null; username?: string }) {
  const userId =
    override?.userId !== undefined && override?.userId !== null
      ? override.userId
      : ctx.user?.id ?? (ctx.localUser?.id != null ? Number(ctx.localUser.id) : null);
  const username =
    override?.username ??
    ctx.user?.username ??
    ctx.localUser?.username ??
    "desconocido";
  return { userId, username };
}

/** Desde procedures tRPC con TrpcContext completo. */
export async function recordAuditFromTrpc(ctx: TrpcContext, data: AuditRecordInput): Promise<void> {
  const { userId, username } = resolveActor(ctx, { userId: data.userId, username: data.username });
  const ip = data.ip !== undefined && data.ip !== null ? data.ip || undefined : getClientIp(ctx.req);
  await createAuditLog({
    userId: userId ?? undefined,
    username,
    action: data.action,
    entity: data.entity,
    entityId: data.entityId ?? undefined,
    expedienteId: data.expedienteId ?? undefined,
    expedienteCodigo: data.expedienteCodigo ?? undefined,
    changes: data.changes ?? undefined,
    ip,
  });
}

/** Login, upload REST, etc. (sin ctx.user). */
export async function recordAuditDirect(
  data: AuditRecordInput & { username: string; userId?: number | null; ip?: string | null }
): Promise<void> {
  await createAuditLog({
    userId: data.userId ?? undefined,
    username: data.username,
    action: data.action,
    entity: data.entity,
    entityId: data.entityId ?? undefined,
    expedienteId: data.expedienteId ?? undefined,
    expedienteCodigo: data.expedienteCodigo ?? undefined,
    changes: data.changes ?? undefined,
    ip: data.ip ?? undefined,
  });
}
