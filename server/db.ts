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
  localUsers, catalogMeta,
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

// ─── METADATOS DE CATÁLOGOS ──────────────────────────────────────────────────

// Tablas fijas del sistema (no eliminables)
const FIXED_CATALOGS = [
  { tableName: "monedas",    realTable: "catalog_monedas",             title: "Monedas" },
  { tableName: "paises",     realTable: "catalog_paises",              title: "Países" },
  { tableName: "empresas",   realTable: "catalog_empresas",            title: "Empresas" },
  { tableName: "doctos",     realTable: "catalog_documento_identidad", title: "Doc. Identidad" },
  { tableName: "unidades",   realTable: "catalog_unidades_negocio",    title: "Unidades de Negocio" },
  { tableName: "soluciones", realTable: "catalog_soluciones",          title: "Soluciones" },
  { tableName: "detalle",    realTable: "catalog_detalle_servicio",    title: "Detalle Servicio" },
  { tableName: "tipos",      realTable: "catalog_tipo_venta",          title: "Tipos de Venta" },
  { tableName: "plazos",     realTable: "catalog_plazos",              title: "Plazos" },
  { tableName: "documentos", realTable: "catalog_documentos",          title: "Documentos" },
  { tableName: "cecos",      realTable: "catalog_cecos",               title: "CECOs" },
  { tableName: "deptos",     realTable: "catalog_departamentos",       title: "Departamentos" },
  { tableName: "areas",      realTable: "catalog_areas",               title: "Áreas" },
  { tableName: "nombres",    realTable: "catalog_nombres",             title: "Nombres" },
];

// Seed de catalog_meta al arrancar
export function seedCatalogMeta() {
  const rawDb = sqlite;
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS catalog_meta (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      table_name TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      is_custom INTEGER DEFAULT 0 NOT NULL,
      linked_field TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
    );
  `);
  const upsert = rawDb.prepare(
    `INSERT INTO catalog_meta (table_name, title, is_custom) VALUES (?, ?, 0)
     ON CONFLICT(table_name) DO NOTHING`
  );
  for (const c of FIXED_CATALOGS) upsert.run(c.tableName, c.title);
}

export async function listCatalogMeta() {
  const db = await getDb();
  return db.select().from(catalogMeta).orderBy(catalogMeta.id);
}

export async function createCatalogTable(tableName: string, title: string) {
  // Validar nombre: solo letras, números y guiones bajos
  if (!/^[a-z0-9_]+$/.test(tableName)) throw new Error("Nombre inválido: solo letras minúsculas, números y guiones bajos");
  const realTable = `catalog_custom_${tableName}`;
  const rawDb = sqlite;
  rawDb.exec(`CREATE TABLE IF NOT EXISTS ${realTable} (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, valor TEXT NOT NULL, activo INTEGER DEFAULT 1 NOT NULL)`);
  const db = await getDb();
  await db.insert(catalogMeta).values({ tableName, title, isCustom: 1 });
  return { tableName, title, isCustom: 1 };
}

export async function renameCatalogTable(tableName: string, newTitle: string) {
  const db = await getDb();
  await db.update(catalogMeta).set({ title: newTitle }).where(eq(catalogMeta.tableName, tableName));
}

export async function deleteCatalogTable(tableName: string) {
  const db = await getDb();
  const rows = await db.select().from(catalogMeta).where(eq(catalogMeta.tableName, tableName)).limit(1);
  if (!rows.length) throw new Error("Catálogo no encontrado");
  if (!rows[0].isCustom) throw new Error("No se pueden eliminar catálogos del sistema");
  const realTable = `catalog_custom_${tableName}`;
  sqlite.exec(`DROP TABLE IF EXISTS ${realTable}`);
  await db.delete(catalogMeta).where(eq(catalogMeta.tableName, tableName));
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
  if (table) return table;
  // Tablas dinámicas: usar SQL raw
  return null;
}

// CRUD genérico que soporta tablas fijas (Drizzle) y dinámicas (SQL raw)
export async function getCatalogListGeneric(tableName: string) {
  const table = catalogMap[tableName];
  if (table) {
    const db = await getDb();
    return db.select().from(table);
  }
  // Tabla dinámica
  const realTable = `catalog_custom_${tableName}`;
  return sqlite.prepare(`SELECT * FROM ${realTable} ORDER BY id`).all();
}

export async function createCatalogRecordGeneric(tableName: string, data: any) {
  const table = catalogMap[tableName];
  if (table) {
    const db = await getDb();
    return db.insert(table).values(data).returning();
  }
  const realTable = `catalog_custom_${tableName}`;
  const stmt = sqlite.prepare(`INSERT INTO ${realTable} (valor, activo) VALUES (?, ?) RETURNING *`);
  return [stmt.get(data.valor ?? 'Nuevo', data.activo ?? 1)];
}

export async function updateCatalogRecordGeneric(tableName: string, id: number, data: any) {
  const table = catalogMap[tableName];
  if (table) {
    const db = await getDb();
    return db.update(table).set(data).where(eq(table.id, id));
  }
  const realTable = `catalog_custom_${tableName}`;
  const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
  const vals = [...Object.values(data), id];
  sqlite.prepare(`UPDATE ${realTable} SET ${sets} WHERE id = ?`).run(...vals);
}

export async function deleteCatalogRecordGeneric(tableName: string, id: number) {
  const table = catalogMap[tableName];
  if (table) {
    const db = await getDb();
    return db.delete(table).where(eq(table.id, id));
  }
  const realTable = `catalog_custom_${tableName}`;
  sqlite.prepare(`DELETE FROM ${realTable} WHERE id = ?`).run(id);
}

export async function bulkDeleteCatalogRecordsGeneric(tableName: string, ids: number[]) {
  if (!ids.length) return;
  const table = catalogMap[tableName];
  if (table) {
    const db = await getDb();
    return db.delete(table).where(inArray(table.id, ids));
  }
  const realTable = `catalog_custom_${tableName}`;
  const placeholders = ids.map(() => '?').join(',');
  sqlite.prepare(`DELETE FROM ${realTable} WHERE id IN (${placeholders})`).run(...ids);
}

export async function getCatalogList(tableName: string) {
  const table = getCatalogTable(tableName);
  if (!table) return getCatalogListGeneric(tableName);
  const db = await getDb();
  return await db.select().from(table);
}

export async function createCatalogRecord(tableName: string, data: any) {
  const table = getCatalogTable(tableName);
  if (!table) return createCatalogRecordGeneric(tableName, data);
  const db = await getDb();
  return await db.insert(table).values(data).returning();
}

export async function updateCatalogRecord(tableName: string, id: number, data: any) {
  const table = getCatalogTable(tableName);
  if (!table) return updateCatalogRecordGeneric(tableName, id, data);
  const db = await getDb();
  return await db.update(table).set(data).where(eq(table.id, id));
}

export async function deleteCatalogRecord(tableName: string, id: number) {
  const table = getCatalogTable(tableName);
  if (!table) return deleteCatalogRecordGeneric(tableName, id);
  const db = await getDb();
  return await db.delete(table).where(eq(table.id, id));
}

export async function bulkUpdateCatalogRecords(tableName: string, ids: number[], data: any) {
  if (!ids.length) return;
  const table = getCatalogTable(tableName);
  if (!table) return; // tablas dinámicas no tienen bulk update por ahora
  const db = await getDb();
  return await db.update(table).set(data).where(inArray(table.id, ids));
}

export async function bulkDeleteCatalogRecords(tableName: string, ids: number[]) {
  if (!ids.length) return;
  const table = getCatalogTable(tableName);
  if (!table) return bulkDeleteCatalogRecordsGeneric(tableName, ids);
  const db = await getDb();
  return await db.delete(table).where(inArray(table.id, ids));
}

export async function runMigrations() {
  try {
    // Intentar migración estándar de Drizzle primero
    const db = await getDb();
    migrate(db, { migrationsFolder: join(process.cwd(), "drizzle", "migrations") });
    console.log("[DB] Migrations applied successfully");
  } catch (error: any) {
    // Si la migración falla (ej: BD parcialmente migrada), aplicar schema manualmente
    console.warn("[DB] Migration via Drizzle failed, applying schema manually:", error?.message ?? error);
    try {
      const rawDb = sqlite;
      rawDb.exec(`
        CREATE TABLE IF NOT EXISTS localUsers (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          username TEXT NOT NULL UNIQUE,
          passwordHash TEXT NOT NULL,
          displayName TEXT,
          role TEXT DEFAULT 'user' NOT NULL,
          isActive INTEGER DEFAULT 1 NOT NULL,
          createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
          updatedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
          lastSignedIn INTEGER
        );
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          openId TEXT NOT NULL UNIQUE,
          name TEXT,
          email TEXT,
          loginMethod TEXT,
          role TEXT DEFAULT 'user' NOT NULL,
          createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
          updatedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
          lastSignedIn INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
        );
        CREATE TABLE IF NOT EXISTS actas (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          userId INTEGER NOT NULL,
          noActa TEXT, atencion TEXT, fecha INTEGER,
          razonSocial TEXT, nombreFantasia TEXT, rucDniRut TEXT, direccionComercial TEXT,
          representanteLegal TEXT, representanteDni TEXT, representanteEmail TEXT, representanteFono TEXT,
          contactoTecnico TEXT, contactoTecnicoEmail TEXT, contactoTecnicoFono TEXT,
          contactoFacturacion TEXT, contactoFacturacionEmail TEXT, contactoFacturacionFono TEXT,
          serviciosContratados TEXT, formasPagoImplementacion TEXT, formasPagoMantencion TEXT,
          status TEXT DEFAULT 'borrador' NOT NULL,
          createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
          updatedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
        );
        CREATE TABLE IF NOT EXISTS evaluaciones (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          userId INTEGER NOT NULL, actaId INTEGER,
          unidadNegocios TEXT, empresa TEXT, solucion TEXT, tipoMoneda TEXT,
          montoProyecto REAL, tipoCambio REAL, totalClp REAL,
          descripcion TEXT, preventa TEXT, fechaEntrega INTEGER, ejecutivoComercial TEXT,
          plazoImplementacion TEXT, propuestaNumero TEXT, paisImplementacion TEXT,
          rut TEXT, nombreCliente TEXT,
          hardware TEXT, materiales TEXT, rrhh TEXT, otrosGastos TEXT,
          totalHardware REAL, totalMateriales REAL, totalRrhh REAL, totalOtros REAL, totalGastos REAL,
          status TEXT DEFAULT 'borrador' NOT NULL,
          createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
          updatedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
        );
        CREATE TABLE IF NOT EXISTS catalog_monedas (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, valor TEXT NOT NULL UNIQUE, activo INTEGER DEFAULT 1 NOT NULL);
        CREATE TABLE IF NOT EXISTS catalog_paises (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, valor TEXT NOT NULL UNIQUE, activo INTEGER DEFAULT 1 NOT NULL);
        CREATE TABLE IF NOT EXISTS catalog_empresas (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, valor TEXT NOT NULL UNIQUE, activo INTEGER DEFAULT 1 NOT NULL);
        CREATE TABLE IF NOT EXISTS catalog_documento_identidad (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, valor TEXT NOT NULL UNIQUE, activo INTEGER DEFAULT 1 NOT NULL);
        CREATE TABLE IF NOT EXISTS catalog_unidades_negocio (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, valor TEXT NOT NULL UNIQUE, activo INTEGER DEFAULT 1 NOT NULL);
        CREATE TABLE IF NOT EXISTS catalog_soluciones (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, valor TEXT NOT NULL UNIQUE, activo INTEGER DEFAULT 1 NOT NULL);
        CREATE TABLE IF NOT EXISTS catalog_detalle_servicio (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, valor TEXT NOT NULL UNIQUE, activo INTEGER DEFAULT 1 NOT NULL);
        CREATE TABLE IF NOT EXISTS catalog_tipo_venta (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, valor TEXT NOT NULL UNIQUE, activo INTEGER DEFAULT 1 NOT NULL);
        CREATE TABLE IF NOT EXISTS catalog_plazos (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, valor TEXT NOT NULL UNIQUE, activo INTEGER DEFAULT 1 NOT NULL);
        CREATE TABLE IF NOT EXISTS catalog_documentos (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, valor TEXT NOT NULL UNIQUE, activo INTEGER DEFAULT 1 NOT NULL);
        CREATE TABLE IF NOT EXISTS catalog_cecos (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, valor TEXT NOT NULL UNIQUE, activo INTEGER DEFAULT 1 NOT NULL);
        CREATE TABLE IF NOT EXISTS catalog_departamentos (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, valor TEXT NOT NULL UNIQUE, activo INTEGER DEFAULT 1 NOT NULL);
        CREATE TABLE IF NOT EXISTS catalog_areas (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, valor TEXT NOT NULL UNIQUE, activo INTEGER DEFAULT 1 NOT NULL);
        CREATE TABLE IF NOT EXISTS catalog_nombres (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, valor TEXT NOT NULL, activo INTEGER DEFAULT 1 NOT NULL);
      `);
      console.log("[DB] Schema applied manually (fallback)");
    } catch (fallbackError) {
      console.error("[DB] Fallback schema creation also failed:", fallbackError);
    }
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

