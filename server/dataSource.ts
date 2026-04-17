/**
 * dataSource.ts
 * Capa de abstracción de fuente de datos para catálogos y usuarios.
 *
 * USE_API=false (default) → SQLite local via db.ts
 * USE_API=true            → fetch a API_URL externa
 *
 * La API externa debe devolver el mismo shape que SQLite.
 */

import {
  getCatalogList,
  createCatalogRecord,
  updateCatalogRecord,
  deleteCatalogRecord,
  bulkUpdateCatalogRecords,
  bulkDeleteCatalogRecords,
  getUsers,
  createUser,
  findUserByUsername,
  findUserById,
  toggleUserStatus,
  updateUser,
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getUsersByRoleId,
  getDb,
  // Catálogos dinámicos y meta
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
} from "../drizzle/schema";
import { eq, like } from "drizzle-orm";

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
    return apiFetch<any>(`/catalogs/options`);
  }
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const toOptions = (rows: { id: number; valor: string }[]) =>
    rows.map(r => ({ value: r.valor, label: r.valor }));
  const [empresas, nombres, monedas, documentoIdentidad,
    unidadesNegocio, soluciones, detalleServicio, tipoVenta, plazos,
    paises, cecos] =
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
    ]);
  return {
    empresas:           toOptions(empresas),
    nombres:            toOptions(nombres),
    monedas:            toOptions(monedas),
    documentoIdentidad: toOptions(documentoIdentidad),
    unidadesNegocio:    toOptions(unidadesNegocio),
    soluciones:         toOptions(soluciones),
    detalleServicio:    toOptions(detalleServicio),
    tipoVenta:          toOptions(tipoVenta),
    plazos:             toOptions(plazos),
    paises:             toOptions(paises),
    cecos:              toOptions(cecos),
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
    detalles, tipos, plazos, docs, cecos, deptos, areas, nombres
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
  ]);
  return {
    monedas, paises, empresas, doctos, unidades, soluciones,
    detalles, tipos, plazos, docs, cecos, deptos, areas, nombres
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
