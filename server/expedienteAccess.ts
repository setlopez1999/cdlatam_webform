import { EXPEDIENTES_WORKSPACE_GLOBAL_ROLES } from "@shared/const";

const GLOBAL_SET = new Set<string>(EXPEDIENTES_WORKSPACE_GLOBAL_ROLES);

/** Ver listado/detalle de cualquier expediente y mutar como workspace global (servidor). */
export function mayAccessAllExpedientes(role: string | null | undefined): boolean {
  if (!role) return false;
  return GLOBAL_SET.has(role);
}
