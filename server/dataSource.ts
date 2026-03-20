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
  getLocalUsers,
  createLocalUser,
  findLocalUserByUsername,
  findLocalUserById,
  toggleLocalUserStatus,
  getDb,
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

// ─── Usuarios ─────────────────────────────────────────────────────────────────

export async function ds_getLocalUsers() {
  if (USE_API) return apiFetch<any[]>(`/users`);
  return getLocalUsers();
}

export async function ds_findLocalUserByUsername(username: string) {
  if (USE_API) return apiFetch<any>(`/users/by-username/${encodeURIComponent(username)}`);
  return findLocalUserByUsername(username);
}

export async function ds_findLocalUserById(id: number) {
  if (USE_API) return apiFetch<any>(`/users/${id}`);
  return findLocalUserById(id);
}

export async function ds_createLocalUser(user: { username: string; passwordHash: string; displayName?: string; role: string }) {
  if (USE_API) return apiFetch<any>(`/users`, { method: "POST", body: JSON.stringify(user) });
  return createLocalUser(user);
}

export async function ds_toggleLocalUserStatus(id: number, isActive: number) {
  if (USE_API) return apiFetch<any>(`/users/${id}/toggle`, { method: "PUT", body: JSON.stringify({ isActive }) });
  return toggleLocalUserStatus(id, isActive);
}
