// server/db.ts
import { eq, like, or, and, sql, desc, sum, count, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
// Importamos los esquemas (asegúrate de que esta ruta sea correcta)
// --- MODIFICADO: Importar localUsers ---
import {
  InsertUser, users, actas, evaluaciones, InsertActa, InsertEvaluacion,
  localUsers,
  // Catálogos
  catalogMonedas, catalogPaises, catalogEmpresas, catalogDocumentoIdentidad,
  catalogUnidadesNegocio, catalogSoluciones, catalogDetalleServicio,
  catalogTipoVenta, catalogPlazos, catalogDocumentos, catalogCecos,
  catalogDepartamentos, catalogAreas, catalogNombres
} from "../drizzle/schema";

// 1. Inicializar conexión al archivo local "gestion.db"
const LOCAL_DB_PATH = join(process.cwd(), 'gestion.db');

// Soporte para variables de entorno para Docker
let dbPath = LOCAL_DB_PATH;

// Solo usamos DATABASE_URL si existe y no estamos en un entorno donde sea peligroso (ej: path de linux en windows)
if (process.env.DATABASE_URL) {
  const envPath = process.env.DATABASE_URL.replace("file:", "");
  
  // Si estamos en Windows y el path empieza con /app/ (Linux path de Docker), lo ignoramos para desarrollo local
  const isLinuxPathOnWindows = process.platform === 'win32' && envPath.startsWith('/app/');
  
  if (!isLinuxPathOnWindows) {
    dbPath = envPath;
    
    // Asegurar que el directorio existe (útil para Docker con volúmenes)
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir)) {
      try {
        mkdirSync(dbDir, { recursive: true });
      } catch (err) {
        console.warn(`[DB] No se pudo crear el directorio ${dbDir}, usando gestion.db local.`);
        dbPath = LOCAL_DB_PATH;
      }
    }
  }
}

console.log(`[DB] Conectando a base de datos en: ${dbPath}`);
const sqlite = new Database.default(dbPath);
const _db = drizzle(sqlite);

export async function getDb() {
  return _db;
}

// ─── HELPER GENÉRICO PARA CATÁLOGOS ──────────────────────────────────────────

const catalogMap: Record<string, any> = {
  monedas: catalogMonedas,
  paises: catalogPaises,
  empresas: catalogEmpresas,
  doctos: catalogDocumentoIdentidad,
  unidades: catalogUnidadesNegocio,
  soluciones: catalogSoluciones,
  detalle: catalogDetalleServicio,
  tipos: catalogTipoVenta,
  plazos: catalogPlazos,
  documentos: catalogDocumentos,
  cecos: catalogCecos,
  deptos: catalogDepartamentos,
  areas: catalogAreas,
  nombres: catalogNombres,
};

function getCatalogTable(tableName: string) {
  const table = catalogMap[tableName];
  if (!table) throw new Error(`Catálogo no encontrado: ${tableName}`);
  return table;
}

export async function getCatalogList(tableName: string) {
  const db = await getDb();
  const table = getCatalogTable(tableName);
  // Devolvemos todos para poder ver inactivos y reactivarlos desde el cliente
  return await db.select().from(table);
}

export async function createCatalogRecord(tableName: string, data: any) {
  const db = await getDb();
  const table = getCatalogTable(tableName);
  return await db.insert(table).values(data).returning();
}

export async function updateCatalogRecord(tableName: string, id: number, data: any) {
  const db = await getDb();
  const table = getCatalogTable(tableName);
  return await db.update(table).set(data).where(eq(table.id, id));
}

export async function deleteCatalogRecord(tableName: string, id: number) {
  const db = await getDb();
  const table = getCatalogTable(tableName);
  // Hard Delete
  return await db.delete(table).where(eq(table.id, id));
}

export async function bulkUpdateCatalogRecords(tableName: string, ids: number[], data: any) {
  if (!ids.length) return;
  const db = await getDb();
  const table = getCatalogTable(tableName);
  return await db.update(table).set(data).where(inArray(table.id, ids));
}

export async function bulkDeleteCatalogRecords(tableName: string, ids: number[]) {
  if (!ids.length) return;
  const db = await getDb();
  const table = getCatalogTable(tableName);
  return await db.delete(table).where(inArray(table.id, ids));
}

export async function runMigrations() {
  try {
    const db = await getDb();
    migrate(db, { migrationsFolder: join(process.cwd(), "drizzle", "migrations") });
    console.log("[DB] Migrations applied successfully");
  } catch (error) {
    console.error("[DB] Migration failed:", error);
  }
}

// ─── Users (OAuth/OpenID) ──────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }

    // Asignar rol por defecto si es necesario (puedes ajustar esta lógica)
    if (!values.role) values.role = "user";

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    // SQLite upsert
    await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── LOCAL USERS (Username/Password) ──────────────────────────────────────────
// --- AGREGADO: Funciones para usuarios locales ---

export async function getLocalUsers() {
  const db = await getDb();
  return await db.select().from(localUsers);
}

export async function createLocalUser(user: typeof localUsers.$inferInsert) {
  const db = await getDb();
  return await db.insert(localUsers).values(user);
}

export async function findLocalUserByUsername(username: string) {
  const db = await getDb();
  const result = await db.select().from(localUsers).where(eq(localUsers.username, username)).limit(1);
  return result[0];
}

export async function findLocalUserById(id: number) {
  const db = await getDb();
  const result = await db.select().from(localUsers).where(eq(localUsers.id, id)).limit(1);
  return result[0];
}

export async function toggleLocalUserStatus(id: number, isActive: number) {
  const db = await getDb();
  return await db.update(localUsers).set({ isActive }).where(eq(localUsers.id, id));
}

// ─── Actas ────────────────────────────────────────────────────────────────────
export async function getActasByUserId(userId: number) {
  const db = await getDb();
  return db.select().from(actas).where(eq(actas.userId, userId)).orderBy(desc(actas.createdAt));
}

export async function getActaById(id: number) {
  const db = await getDb();
  const result = await db.select().from(actas).where(eq(actas.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createActa(data: InsertActa) {
  const db = await getDb();
  const result = await db.insert(actas).values(data).returning();
  return result[0];
}

export async function updateActa(id: number, data: Partial<InsertActa>) {
  const db = await getDb();
  return db.update(actas).set(data).where(eq(actas.id, id));
}

export async function deleteActa(id: number) {
  const db = await getDb();
  return db.delete(actas).where(eq(actas.id, id));
}

// ─── Evaluaciones de Proyecto ─────────────────────────────────────────────────
export async function getEvaluacionesByUserId(userId: number) {
  const db = await getDb();
  return db.select().from(evaluaciones).where(eq(evaluaciones.userId, userId)).orderBy(desc(evaluaciones.createdAt));
}

export async function getEvaluacionById(id: number) {
  const db = await getDb();
  const result = await db.select().from(evaluaciones).where(eq(evaluaciones.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createEvaluacion(data: InsertEvaluacion) {
  const db = await getDb();
  const result = await db.insert(evaluaciones).values(data).returning();
  return result[0];
}

export async function updateEvaluacion(id: number, data: Partial<InsertEvaluacion>) {
  const db = await getDb();
  return db.update(evaluaciones).set(data).where(eq(evaluaciones.id, id));
}

export async function deleteEvaluacion(id: number) {
  const db = await getDb();
  return db.delete(evaluaciones).where(eq(evaluaciones.id, id));
}

export async function searchRegistros(userId: number, query: string) {
  const db = await getDb();

  const actasResult = await db
    .select()
    .from(actas)
    .where(
      and(
        eq(actas.userId, userId),
        or(
          like(actas.razonSocial, `%${query}%`),
          like(actas.noActa, `%${query}%`),
          like(actas.atencion, `%${query}%`)
        )
      )
    )
    .limit(20);

  const evaluacionesResult = await db
    .select()
    .from(evaluaciones)
    .where(
      and(
        eq(evaluaciones.userId, userId),
        or(
          like(evaluaciones.nombreCliente, `%${query}%`),
          like(evaluaciones.empresa, `%${query}%`),
          like(evaluaciones.propuestaNumero, `%${query}%`)
        )
      )
    )
    .limit(20);

  return { actas: actasResult, evaluaciones: evaluacionesResult };
}