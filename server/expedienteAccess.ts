import { userHasRole } from "./db";

/** Ver listado/detalle de cualquier expediente y mutar como workspace global (servidor). */
export async function mayAccessAllExpedientes(userId: number): Promise<boolean> {
  return userHasRole(userId, "admin");
}
