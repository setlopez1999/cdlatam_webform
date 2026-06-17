/**
 * dataSource.ts
 * Capa de abstracción de fuente de datos — ÚNICA puerta de entrada para routers.ts.
 *
 * USE_API=false (default) → SQLite local via db.ts
 * USE_API=true            → fetch a API_URL externa
 *
 * La API externa debe devolver el mismo shape que SQLite.
 *
 * Cláusulas legales: ver dataSource-clausulas.ts (mismo patrón ds_*, capa aparte).
 *
 * SECCIONES:
 *  1. Catálogos — CRUD genérico
 *  2. Catálogos — opciones para comboboxes
 *  3. Catálogos — resumen para BaseDatos
 *  4. Catálogos — búsqueda
 *  5. Usuarios
 *  6. Roles
 *  7. Catálogos — Metadatos y tablas dinámicas
 *  8. User-Roles (RBAC N:N)
 *  9. Actas (F1)
 * 10. Evaluaciones (F2)
 * 11. Resultados (F3)
 * 12. Implementación (checklist)
 * 13. Expedientes
 * 14. Gestor de Horarios
 * 15. Audit Log
 * 16. Utilidades SQLite (diagnóstico)
 */

import {
  // Catálogos
  getCatalogList,
  createCatalogRecord,
  updateCatalogRecord,
  deleteCatalogRecord,
  bulkUpdateCatalogRecords,
  bulkDeleteCatalogRecords,
  // Usuarios
  getUsers,
  createUser,
  findUserByUsername,
  findUserById,
  toggleUserStatus,
  updateUser,
  updateUserCredentials,
  deleteUserById,
  // Roles
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getUsersByRoleId,
  // User-Roles (RBAC N:N)
  getUserRoles,
  getUserRoleNames,
  assignRoleToUser,
  revokeRoleFromUser,
  setUserRoles,
  toggleHorariosEasterEgg,
  // Actas (F1)
  getActasByUserId,
  getActaById,
  createActa,
  updateActa,
  deleteActa,
  getActaByExpedienteId,
  // Evaluaciones (F2)
  getEvaluacionesByUserId,
  getEvaluacionById,
  createEvaluacion,
  updateEvaluacion,
  deleteEvaluacion,
  getEvaluacionByExpedienteId,
  // Resultados (F3)
  upsertResultadoExpediente,
  // Implementación
  listImplementacionesByExpedienteId,
  upsertImplementacionCheck,
  listImplementacionCatalogActivos,
  isActiveImplementacionCatalogKey,
  // Expedientes
  crearExpedienteConActa,
  getExpedientesByUser,
  getExpedienteById,
  updateExpediente,
  deleteExpedienteCascadeById,
  moverExpedienteAPapelera,
  restaurarExpedienteDePapelera,
  getExpedientesEnPapelera,
  listExpedientesResumen,
  listExpedientesResumenGlobal,
  getExpedienteDetalle,
  getExpedienteDetalleGlobal,
  // Horarios
  getEmpleados,
  getEmpleadoById,
  createEmpleado,
  updateEmpleado,
  toggleEmpleadoStatus,
  deleteEmpleado,
  getContratosByEmpleado,
  getContratoActivoByEmpleado,
  createContrato,
  updateContrato,
  getBloquesByContrato,
  setBloques,
  getBloquesSemanales,
  // Búsqueda
  searchRegistros,
  // Audit Log
  getAuditLogFiltered,
  type AuditLogQueryFilter,
  // Utilidades SQLite
  getSqliteDbPath,
  getRawDb,
  // Catálogos dinámicos y meta
  getDb,
  listCatalogMeta,
  createCatalogTable,
  renameCatalogTable,
  deleteCatalogTable,
  getCatalogListGeneric,
  createCatalogRecordGeneric,
  updateCatalogRecordGeneric,
  deleteCatalogRecordGeneric,
  bulkDeleteCatalogRecordsGeneric,
} from "./db";
import {
  catalogMonedas, catalogPaises, catalogEmpresas, catalogDocumentoIdentidad,
  catalogUnidadesNegocio, catalogSoluciones, catalogDetalleServicio,
  catalogTipoVenta, catalogPlazos, catalogDocumentos, catalogCecos,
  catalogDepartamentos, catalogAreas, catalogNombres,
  catalogConsideracionesComerciales,
  catalogImplementacionItems,
} from "../drizzle/schema";
import { asc, eq, like } from "drizzle-orm";

// ─── Config ───────────────────────────────────────────────────────────────────

const USE_API = process.env.USE_API === "true";
const API_URL = (process.env.API_URL ?? "").replace(/\/$/, "");

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// ─── Catálogos — CRUD genérico ────────────────────────────────────────────────

export async function ds_getCatalogList(tableName: string) {
  if (USE_API) return apiFetch<any[]>(`/catalogs/${tableName}`);
  return getCatalogList(tableName);
}

export async function ds_createCatalogRecord(tableName: string, data: any) {
  if (USE_API) return apiFetch<any>(`/catalogs/${tableName}`, { method: "POST", body: JSON.stringify(data) });
  return createCatalogRecord(tableName, data);
}

export async function ds_updateCatalogRecord(tableName: string, id: number, data: any) {
  if (USE_API) return apiFetch<any>(`/catalogs/${tableName}/${id}`, { method: "PUT", body: JSON.stringify(data) });
  return updateCatalogRecord(tableName, id, data);
}

export async function ds_deleteCatalogRecord(tableName: string, id: number) {
  if (USE_API) return apiFetch<any>(`/catalogs/${tableName}/${id}`, { method: "DELETE" });
  return deleteCatalogRecord(tableName, id);
}

export async function ds_bulkUpdateCatalogRecords(tableName: string, ids: number[], data: any) {
  if (USE_API) return apiFetch<any>(`/catalogs/${tableName}/bulk-update`, { method: "PUT", body: JSON.stringify({ ids, data }) });
  return bulkUpdateCatalogRecords(tableName, ids, data);
}

export async function ds_bulkDeleteCatalogRecords(tableName: string, ids: number[]) {
  if (USE_API) return apiFetch<any>(`/catalogs/${tableName}/bulk-delete`, { method: "DELETE", body: JSON.stringify({ ids }) });
  return bulkDeleteCatalogRecords(tableName, ids);
}

// ─── Catálogos — opciones para comboboxes ────────────────────────────────────

const MESES = [
  { value: "Enero", label: "Enero" }, { value: "Febrero", label: "Febrero" },
  { value: "Marzo", label: "Marzo" }, { value: "Abril", label: "Abril" },
  { value: "Mayo", label: "Mayo" }, { value: "Junio", label: "Junio" },
  { value: "Julio", label: "Julio" }, { value: "Agosto", label: "Agosto" },
  { value: "Septiembre", label: "Septiembre" }, { value: "Octubre", label: "Octubre" },
  { value: "Noviembre", label: "Noviembre" }, { value: "Diciembre", label: "Diciembre" },
];

export async function ds_getCatalogOptions() {
  if (USE_API) {
    /** Debe alinearse con la rama SQLite (incl. `areas` para F2 hardware/materiales). */
    return apiFetch<any>(`/catalogs/options`);
  }
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const toOptions = (rows: { id: number; valor: string }[]) =>
    rows.map(r => ({ value: r.valor, label: r.valor }));
  const [empresas, nombres, monedas, documentoIdentidad,
    unidadesNegocio, soluciones, detalleServicio, tipoVenta, plazos,
    paises, cecos, areas, consideracionesComerciales] =
    await Promise.all([
      db.select().from(catalogEmpresas).where(eq(catalogEmpresas.activo, 1)),
      db.select().from(catalogNombres).where(eq(catalogNombres.activo, 1)),
      db.select().from(catalogMonedas).where(eq(catalogMonedas.activo, 1)),
      db.select().from(catalogDocumentoIdentidad).where(eq(catalogDocumentoIdentidad.activo, 1)),
      db.select().from(catalogUnidadesNegocio).where(eq(catalogUnidadesNegocio.activo, 1)),
      db.select().from(catalogSoluciones).where(eq(catalogSoluciones.activo, 1)),
      db.select().from(catalogDetalleServicio).where(eq(catalogDetalleServicio.activo, 1)),
      db.select().from(catalogTipoVenta).where(eq(catalogTipoVenta.activo, 1)),
      db.select().from(catalogPlazos).where(eq(catalogPlazos.activo, 1)),
      db.select().from(catalogPaises).where(eq(catalogPaises.activo, 1)),
      db.select().from(catalogCecos).where(eq(catalogCecos.activo, 1)),
      db.select().from(catalogAreas).where(eq(catalogAreas.activo, 1)),
      db.select().from(catalogConsideracionesComerciales)
        .where(eq(catalogConsideracionesComerciales.activo, 1))
        .orderBy(asc(catalogConsideracionesComerciales.orden), asc(catalogConsideracionesComerciales.id)),
    ]);
  return {
    empresas:           toOptions(empresas),
    nombres:            toOptions(nombres),
    monedas:            toOptions(monedas),
    documentoIdentidad: toOptions(documentoIdentidad),
    unidadesNegocio:    unidadesNegocio.map(r => ({ id: r.id, value: r.valor, label: r.valor })),
    soluciones:         soluciones.map(r => ({ id: r.id, value: r.valor, label: r.valor, unidadNegocioId: r.unidadNegocioId })),
    detalleServicio:    detalleServicio.map(r => ({ id: r.id, value: r.valor, label: r.valor, solucionId: r.solucionId })),
    tipoVenta:          toOptions(tipoVenta),
    plazos:             toOptions(plazos),
    paises:             toOptions(paises),
    cecos:              toOptions(cecos),
    areas:              toOptions(areas),
    consideracionesComerciales: consideracionesComerciales.map(r => ({
      id: r.id,
      value: r.valor,
      label: r.valor,
      orden: r.orden,
      persistente: r.persistente ?? 0,
    })),
    preventas:          (await getCatalogListGeneric("preventas")).map((r: any) => ({
      value: r.valor,
      label: r.valor,
    })),
    meses: MESES,
  };
}

// ─── Catálogos — resumen para BaseDatos ──────────────────────────────────────

export async function ds_getCatalogSummary() {
  if (USE_API) return apiFetch<any>(`/catalogs/summary`);
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const [
    monedas, paises, empresas, doctos, unidades, soluciones,
    detalles, tipos, plazos, docs, cecos, deptos, areas, nombres,
    consideracionesComerciales,
    implementacionItems,
  ] = await Promise.all([
    db.select().from(catalogMonedas).where(eq(catalogMonedas.activo, 1)),
    db.select().from(catalogPaises).where(eq(catalogPaises.activo, 1)),
    db.select().from(catalogEmpresas).where(eq(catalogEmpresas.activo, 1)),
    db.select().from(catalogDocumentoIdentidad).where(eq(catalogDocumentoIdentidad.activo, 1)),
    db.select().from(catalogUnidadesNegocio).where(eq(catalogUnidadesNegocio.activo, 1)),
    db.select().from(catalogSoluciones).where(eq(catalogSoluciones.activo, 1)),
    db.select().from(catalogDetalleServicio).where(eq(catalogDetalleServicio.activo, 1)),
    db.select().from(catalogTipoVenta).where(eq(catalogTipoVenta.activo, 1)),
    db.select().from(catalogPlazos).where(eq(catalogPlazos.activo, 1)),
    db.select().from(catalogDocumentos).where(eq(catalogDocumentos.activo, 1)),
    db.select().from(catalogCecos).where(eq(catalogCecos.activo, 1)),
    db.select().from(catalogDepartamentos).where(eq(catalogDepartamentos.activo, 1)),
    db.select().from(catalogAreas).where(eq(catalogAreas.activo, 1)),
    db.select().from(catalogNombres).where(eq(catalogNombres.activo, 1)),
    db.select().from(catalogConsideracionesComerciales)
      .where(eq(catalogConsideracionesComerciales.activo, 1))
      .orderBy(asc(catalogConsideracionesComerciales.orden), asc(catalogConsideracionesComerciales.id)),
    db.select().from(catalogImplementacionItems)
      .where(eq(catalogImplementacionItems.activo, 1))
      .orderBy(asc(catalogImplementacionItems.orden), asc(catalogImplementacionItems.id)),
  ]);
  return {
    monedas, paises, empresas, doctos, unidades, soluciones,
    detalles, tipos, plazos, docs, cecos, deptos, areas, nombres,
    consideracionesComerciales,
    implementacionItems,
  };
}

// ─── Catálogos — búsqueda ─────────────────────────────────────────────────────

export async function ds_searchCatalogs(query: string) {
  if (USE_API) return apiFetch<any>(`/catalogs/search?q=${encodeURIComponent(query)}`);
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const q = `%${query}%`;
  const [cecos, soluciones, detalles] = await Promise.all([
    db.select().from(catalogCecos).where(like(catalogCecos.valor, q)),
    db.select().from(catalogSoluciones).where(like(catalogSoluciones.valor, q)),
    db.select().from(catalogDetalleServicio).where(like(catalogDetalleServicio.valor, q)),
  ]);
  return { cecos, soluciones, detalles };
}

// ─── Usuarios ────────────────────────────────────────────────────────────────────

export async function ds_getUsers() {
  if (USE_API) return apiFetch<any[]>(`/users`);
  return getUsers();
}
/** @deprecated Usar ds_getUsers */
export const ds_getLocalUsers = ds_getUsers;

export async function ds_findUserByUsername(username: string) {
  if (USE_API) return apiFetch<any>(`/users/by-username/${encodeURIComponent(username)}`);
  return findUserByUsername(username);
}
/** @deprecated Usar ds_findUserByUsername */
export const ds_findLocalUserByUsername = ds_findUserByUsername;

export async function ds_findUserById(id: number) {
  if (USE_API) return apiFetch<any>(`/users/${id}`);
  return findUserById(id);
}
/** @deprecated Usar ds_findUserById */
export const ds_findLocalUserById = ds_findUserById;

export async function ds_createUser(user: { username: string; passwordHash: string; displayName?: string; role: string; roleId?: number | null }) {
  if (USE_API) return apiFetch<any>(`/users`, { method: "POST", body: JSON.stringify(user) });
  return createUser(user);
}
/** @deprecated Usar ds_createUser */
export const ds_createLocalUser = ds_createUser;

export async function ds_toggleUserStatus(id: number, isActive: number) {
  if (USE_API) return apiFetch<any>(`/users/${id}/toggle`, { method: "PUT", body: JSON.stringify({ isActive }) });
  return toggleUserStatus(id, isActive);
}
/** @deprecated Usar ds_toggleUserStatus */
export const ds_toggleLocalUserStatus = ds_toggleUserStatus;

export async function ds_updateUser(id: number, data: { displayName?: string; roleId?: number | null; role?: string }) {
  if (USE_API) return apiFetch<any>(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) });
  return updateUser(id, data);
}

/**
 * Actualiza credenciales (username y/o passwordHash) de un usuario.
 * Cuando USE_API=true apunta a PUT /users/:id/credentials.
 */
export async function ds_updateUserCredentials(
  id: number,
  data: { username?: string; passwordHash?: string },
): Promise<void> {
  if (USE_API) {
    await apiFetch<void>(`/users/${id}/credentials`, { method: "PUT", body: JSON.stringify(data) });
    return;
  }
  return updateUserCredentials(id, data);
}

/**
 * Elimina un usuario permanentemente (solo users + user_roles).
 * Los expedientes quedan huérfanos — se muestran en workspace con indicador visual.
 */
export async function ds_deleteUser(id: number): Promise<void> {
  if (USE_API) {
    await apiFetch<void>(`/users/${id}`, { method: "DELETE" });
    return;
  }
  return deleteUserById(id);
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export async function ds_getRoles() {
  if (USE_API) return apiFetch<any[]>(`/roles`);
  return getRoles();
}

export async function ds_getRoleById(id: number) {
  if (USE_API) return apiFetch<any>(`/roles/${id}`);
  return getRoleById(id);
}

export async function ds_createRole(data: { nombre: string; label: string; descripcion?: string }) {
  if (USE_API) return apiFetch<any>(`/roles`, { method: "POST", body: JSON.stringify(data) });
  return createRole(data);
}

export async function ds_updateRole(id: number, data: { nombre?: string; label?: string; descripcion?: string; activo?: number }) {
  if (USE_API) return apiFetch<any>(`/roles/${id}`, { method: "PUT", body: JSON.stringify(data) });
  return updateRole(id, data);
}

export async function ds_deleteRole(id: number) {
  if (USE_API) return apiFetch<any>(`/roles/${id}`, { method: "DELETE" });
  return deleteRole(id);
}

export async function ds_getUsersByRoleId(roleId: number) {
  if (USE_API) return apiFetch<any[]>(`/roles/${roleId}/users`);
  return getUsersByRoleId(roleId);
}

// ─── Catálogos — Metadatos y gestión de tablas dinámicas ─────────────────────
// Nota: Las operaciones de estructura (CREATE/DROP TABLE) son siempre SQLite-only
// porque son DDL. El CRUD de registros dinámicos sí respeta USE_API.

export async function ds_listCatalogMeta() {
  // La estructura de tablas siempre viene de SQLite local
  return listCatalogMeta();
}

export async function ds_createCatalogTable(tableName: string, title: string) {
  // DDL siempre en SQLite local
  return createCatalogTable(tableName, title);
}

export async function ds_renameCatalogTable(tableName: string, newTitle: string) {
  return renameCatalogTable(tableName, newTitle);
}

export async function ds_deleteCatalogTable(tableName: string) {
  return deleteCatalogTable(tableName);
}

// CRUD genérico de registros en tablas dinámicas — respeta USE_API

export async function ds_getCatalogListGeneric(tableName: string) {
  if (USE_API) return apiFetch<any[]>(`/catalogs/custom/${tableName}`);
  return getCatalogListGeneric(tableName);
}

export async function ds_createCatalogRecordGeneric(tableName: string, data: any) {
  if (USE_API) return apiFetch<any>(`/catalogs/custom/${tableName}`, { method: "POST", body: JSON.stringify(data) });
  return createCatalogRecordGeneric(tableName, data);
}

export async function ds_updateCatalogRecordGeneric(tableName: string, id: number, data: any) {
  if (USE_API) return apiFetch<any>(`/catalogs/custom/${tableName}/${id}`, { method: "PUT", body: JSON.stringify(data) });
  return updateCatalogRecordGeneric(tableName, id, data);
}

export async function ds_deleteCatalogRecordGeneric(tableName: string, id: number) {
  if (USE_API) return apiFetch<any>(`/catalogs/custom/${tableName}/${id}`, { method: "DELETE" });
  return deleteCatalogRecordGeneric(tableName, id);
}

export async function ds_bulkDeleteCatalogRecordsGeneric(tableName: string, ids: number[]) {
  if (USE_API) return apiFetch<any>(`/catalogs/custom/${tableName}/bulk-delete`, { method: "DELETE", body: JSON.stringify({ ids }) });
  return bulkDeleteCatalogRecordsGeneric(tableName, ids);
}

export async function ds_allCounts(): Promise<Record<string, number>> {
  if (USE_API) return apiFetch<Record<string, number>>(`/catalogs/all-counts`);
  const metas = await listCatalogMeta();
  const counts: Record<string, number> = {};
  for (const m of metas) {
    const rows = await getCatalogListGeneric(m.tableName);
    counts[m.tableName] = (rows as any[]).filter((r: any) => r.activo !== 0).length;
  }
  return counts;
}

// ─── 8. User-Roles (RBAC N:N) ────────────────────────────────────────────────
// Nota: estas operaciones son siempre SQLite-local (no tienen equivalente API externa).

export async function ds_getUserRoles(userId: number) {
  return getUserRoles(userId);
}

export async function ds_getUserRoleNames(userId: number) {
  return getUserRoleNames(userId);
}

export async function ds_assignRoleToUser(userId: number, roleId: number) {
  return assignRoleToUser(userId, roleId);
}

export async function ds_revokeRoleFromUser(userId: number, roleId: number) {
  return revokeRoleFromUser(userId, roleId);
}

export async function ds_setUserRoles(userId: number, roleIds: number[]) {
  return setUserRoles(userId, roleIds);
}

export async function ds_toggleHorariosEasterEgg(userId: number) {
  return toggleHorariosEasterEgg(userId);
}

// ─── 9. Actas (F1) ───────────────────────────────────────────────────────────

export async function ds_getActasByUserId(userId: number) {
  return getActasByUserId(userId);
}

export async function ds_getActaById(id: number) {
  return getActaById(id);
}

export async function ds_createActa(data: Parameters<typeof createActa>[0]) {
  return createActa(data);
}

export async function ds_updateActa(id: number, data: Parameters<typeof updateActa>[1]) {
  return updateActa(id, data);
}

export async function ds_deleteActa(id: number) {
  return deleteActa(id);
}

export async function ds_getActaByExpedienteId(expedienteId: number) {
  return getActaByExpedienteId(expedienteId);
}

// ─── 10. Evaluaciones (F2) ───────────────────────────────────────────────────

export async function ds_getEvaluacionesByUserId(userId: number) {
  return getEvaluacionesByUserId(userId);
}

export async function ds_getEvaluacionById(id: number) {
  return getEvaluacionById(id);
}

export async function ds_createEvaluacion(data: Parameters<typeof createEvaluacion>[0]) {
  return createEvaluacion(data);
}

export async function ds_updateEvaluacion(id: number, data: Parameters<typeof updateEvaluacion>[1]) {
  return updateEvaluacion(id, data);
}

export async function ds_deleteEvaluacion(id: number) {
  return deleteEvaluacion(id);
}

export async function ds_getEvaluacionByExpedienteId(expedienteId: number) {
  return getEvaluacionByExpedienteId(expedienteId);
}

// ─── 11. Resultados (F3) ─────────────────────────────────────────────────────

export async function ds_upsertResultadoExpediente(data: Parameters<typeof upsertResultadoExpediente>[0]) {
  return upsertResultadoExpediente(data);
}

// ─── 12. Implementación (checklist) ──────────────────────────────────────────

export async function ds_listImplementacionesByExpedienteId(expedienteId: number) {
  return listImplementacionesByExpedienteId(expedienteId);
}

export async function ds_upsertImplementacionCheck(expedienteId: number, checkKey: string, estado: boolean) {
  return upsertImplementacionCheck(expedienteId, checkKey, estado);
}

export async function ds_listImplementacionCatalogActivos() {
  return listImplementacionCatalogActivos();
}

export async function ds_isActiveImplementacionCatalogKey(key: string) {
  return isActiveImplementacionCatalogKey(key);
}

// ─── 13. Expedientes ─────────────────────────────────────────────────────────

export async function ds_crearExpedienteConActa(data: Parameters<typeof crearExpedienteConActa>[0]) {
  return crearExpedienteConActa(data);
}

export async function ds_getExpedientesByUser(userId: number) {
  return getExpedientesByUser(userId);
}

export async function ds_getExpedienteById(id: number) {
  return getExpedienteById(id);
}

export async function ds_updateExpediente(id: number, data: Parameters<typeof updateExpediente>[1]) {
  return updateExpediente(id, data);
}

export async function ds_deleteExpedienteCascadeById(id: number) {
  return deleteExpedienteCascadeById(id);
}

export async function ds_moverExpedienteAPapelera(id: number) {
  return moverExpedienteAPapelera(id);
}

export async function ds_restaurarExpedienteDePapelera(id: number) {
  return restaurarExpedienteDePapelera(id);
}

export async function ds_getExpedientesEnPapelera(userId: number) {
  return getExpedientesEnPapelera(userId);
}

export async function ds_listExpedientesResumen(userId: number) {
  return listExpedientesResumen(userId);
}

export async function ds_listExpedientesResumenGlobal() {
  return listExpedientesResumenGlobal();
}

export async function ds_getExpedienteDetalle(id: number, userId: number) {
  return getExpedienteDetalle(id, userId);
}

export async function ds_getExpedienteDetalleGlobal(id: number) {
  return getExpedienteDetalleGlobal(id);
}

// ─── 14. Gestor de Horarios ───────────────────────────────────────────────────

export async function ds_getEmpleados() {
  return getEmpleados();
}

export async function ds_getEmpleadoById(id: number) {
  return getEmpleadoById(id);
}

export async function ds_createEmpleado(data: Parameters<typeof createEmpleado>[0]) {
  return createEmpleado(data);
}

export async function ds_updateEmpleado(id: number, data: Parameters<typeof updateEmpleado>[1]) {
  return updateEmpleado(id, data);
}

export async function ds_toggleEmpleadoStatus(id: number, activo: number) {
  return toggleEmpleadoStatus(id, activo);
}

export async function ds_deleteEmpleado(id: number) {
  return deleteEmpleado(id);
}

export async function ds_getContratosByEmpleado(empleadoId: number) {
  return getContratosByEmpleado(empleadoId);
}

export async function ds_getContratoActivoByEmpleado(empleadoId: number) {
  return getContratoActivoByEmpleado(empleadoId);
}

export async function ds_createContrato(data: Parameters<typeof createContrato>[0]) {
  return createContrato(data);
}

export async function ds_updateContrato(id: number, data: Parameters<typeof updateContrato>[1]) {
  return updateContrato(id, data);
}

export async function ds_getBloquesByContrato(contratoId: number) {
  return getBloquesByContrato(contratoId);
}

export async function ds_setBloques(contratoId: number, bloques: Parameters<typeof setBloques>[1]) {
  return setBloques(contratoId, bloques);
}

export async function ds_getBloquesSemanales() {
  return getBloquesSemanales();
}

// ─── 15. Búsqueda ─────────────────────────────────────────────────────────────

export async function ds_searchRegistros(userId: number, query: string) {
  return searchRegistros(userId, query);
}

// ─── 16. Audit Log ───────────────────────────────────────────────────────────

export async function ds_getAuditLogFiltered(f: AuditLogQueryFilter) {
  return getAuditLogFiltered(f);
}

// ─── 17. Utilidades SQLite (diagnóstico) ─────────────────────────────────────
// Solo disponibles cuando USE_API=false (SQLite local).
// En producción con PostgreSQL estas funciones no aplican.

export function ds_getSqliteDbPath(): string {
  return getSqliteDbPath();
}

export function ds_getRawDb() {
  return getRawDb();
}
// Nota: ds_findUserById está definido en la sección Usuarios (ver más arriba).
