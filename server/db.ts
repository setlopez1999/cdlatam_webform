// server/db.ts
import { eq, like, or, and, sql, desc, sum, count, inArray, lt, lte, gte, asc } from "drizzle-orm";
import { join } from 'path';
import { buildActaCodigo } from "./documentCodes";
import { ensureAllProjectTables } from "./schemaBootstrap";
import { resolveDbPath, isPostgresUrl } from "./_core/dbConfig";

// ─── DRIVER SWITCH: PostgreSQL vs SQLite ────────────────────────────────────
// Se selecciona en tiempo de arranque según DATABASE_URL.
// PostgreSQL: DATABASE_URL=postgresql://user:pass@host:5432/dbname
// SQLite:     DATABASE_URL=file:/app/data/gestion.db  (o vacío → ./gestion.db)
const USE_POSTGRES = isPostgresUrl(process.env.DATABASE_URL);

if (USE_POSTGRES) {
  console.log("[DB] ✅ Driver: PostgreSQL (" + process.env.DATABASE_URL?.split("@")[1] + ")");
} else {
  console.log("[DB] ℹ️  Driver: SQLite");
}

// Imports condicionales de Drizzle
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { migrate as migrateSqlite } from "drizzle-orm/better-sqlite3/migrator";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import * as Database from 'better-sqlite3';
import { Pool } from 'pg';

// Importamos los esquemas (SQLite por defecto, PG cuando USE_POSTGRES=true)
import {
  InsertUser, users, roles, type Role, type InsertRole,
  userRoles, type UserRole, type InsertUserRole,
  actas, evaluaciones, InsertActa, InsertEvaluacion,
  catalogMeta,
  // Catálogos
  catalogMonedas, catalogPaises, catalogEmpresas, catalogDocumentoIdentidad,
  catalogUnidadesNegocio, catalogSoluciones, catalogDetalleServicio,
  catalogTipoVenta, catalogPlazos, catalogDocumentos, catalogCecos,
  catalogDepartamentos, catalogAreas, catalogNombres, catalogConsideracionesComerciales,
  catalogImplementacionItems,
  // Catálogos convertidos de dinámicos → fijos
  catalogPreventas, catalogConceptosGasto, catalogGerencias,
  catalogSolicitantes, catalogFlujosAprobacion, catalogTiposGasto,
  catalogProyectos, catalogTiposPago, catalogEspecialistasExternos,
  catalogTecnicosInternos, catalogNrosActa, catalogEjecutivosAtencion, catalogSets,
  // Gestor de Horarios
  schEmpleados, type SchEmpleado, type InsertSchEmpleado,
  schContratos, type SchContrato, type InsertSchContrato,
  schBloquesHorario, type SchBloqueHorario, type InsertSchBloqueHorario,
  // Expedientes y Auditoría
  expedientes, type Expediente, type InsertExpediente,
  resultadosExpediente, type ResultadoExpediente, type InsertResultadoExpediente,
  implementaciones,
  auditLog, type InsertAuditLog,
  // Catálogo de Cláusulas Legales
  catalogClausulas, type CatalogClausula, type InsertCatalogClausula,
} from "../drizzle/schema";

// Variables de conexión (módulo-level, se reasignan en initDb/closeDb)
let dbPath: string;
let sqlite: Database.Database;
let pgPool: Pool;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any; // Drizzle SQLite | Drizzle PG — tipo unificado internamente

/** Inicializa o reinicia la conexión a la base de datos. Idempotente. */
export function initDb(): void {
  if (USE_POSTGRES) {
    // PostgreSQL: pool de conexiones
    if (pgPool) {
      pgPool.end().catch(() => {});
    }
    pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
    _db = drizzlePg(pgPool);
    console.log("[DB] Conexión PostgreSQL establecida.");
  } else {
    // SQLite: archivo local
    if (sqlite) {
      try { sqlite.close(); } catch { /* ignorar */ }
    }
    dbPath = resolveDbPath();
    console.log(`[DB] Conectando a SQLite en: ${dbPath}`);
    sqlite = new Database.default(dbPath);
    sqlite.pragma("foreign_keys = ON");
    _db = drizzleSqlite(sqlite);
  }
}

/** Cierra la conexión actual a la base de datos. */
export function closeDb(): void {
  if (USE_POSTGRES) {
    if (pgPool) pgPool.end().catch(() => {});
  } else {
    if (sqlite) {
      try { sqlite.close(); } catch { /* ignorar */ }
    }
  }
}

/** Ruta efectiva del archivo SQLite (diagnóstico / integridad). Solo SQLite. */
export function getSqliteDbPath(): string {
  return dbPath ?? "(PostgreSQL mode — no SQLite path)";
}

export async function getDb() {
  return _db;
}

/** Retorna la instancia raw de better-sqlite3 (para operaciones directas). Solo SQLite. */
export function getRawDb(): Database.Database {
  if (USE_POSTGRES) throw new Error("[DB] getRawDb() no disponible en modo PostgreSQL");
  return sqlite;
}

// Inicialización al cargar el módulo
initDb();

// --- METADATOS DE CATÁLOGOS --------------------------------------------------

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
  {
    tableName: "consideraciones",
    realTable: "catalog_consideraciones_comerciales",
    title: "Consideraciones comerciales (Acta)",
  },
  {
    tableName: "impl_items",
    realTable: "catalog_implementacion_items",
    title: "Ítems implementación IPTV-OTT",
  },
  // Catálogos convertidos de dinámicos → fijos
  { tableName: "preventas",                realTable: "catalog_preventas",              title: "Preventa" },
  { tableName: "concepto_gasto",           realTable: "catalog_conceptos_gasto",        title: "Concepto de Gasto" },
  { tableName: "gerencias",                realTable: "catalog_gerencias",              title: "Gerencias" },
  { tableName: "solicitante",              realTable: "catalog_solicitantes",           title: "Solicitante" },
  { tableName: "flujo_aprobacion",         realTable: "catalog_flujos_aprobacion",      title: "Flujo de Aprobación" },
  { tableName: "tipo_gasto",               realTable: "catalog_tipos_gasto",            title: "Tipo de Gasto" },
  { tableName: "proyecto",                 realTable: "catalog_proyectos",              title: "Proyecto" },
  { tableName: "tipo_pago",                realTable: "catalog_tipos_pago",             title: "Tipo de Pago" },
  { tableName: "especialista_externo",     realTable: "catalog_especialistas_externos", title: "Especialista Externo" },
  { tableName: "tecnico_interno",          realTable: "catalog_tecnicos_internos",      title: "Técnico Interno" },
  { tableName: "n_de_acta",                realTable: "catalog_nros_acta",              title: "N° de Acta" },
  { tableName: "ejecutivo_atencion_al_cliente", realTable: "catalog_ejecutivos_atencion", title: "Ejecutivo Atención al Cliente" },
  { tableName: "set",                      realTable: "catalog_sets",                   title: "Set" },
];

// Seed de catalog_meta al arrancar
export async function seedCatalogMeta() {
  const db = await getDb();
  // Insertar catálogos fijos usando Drizzle (funciona en SQLite y PostgreSQL)
  // ON CONFLICT DO NOTHING — idempotente
  for (const c of FIXED_CATALOGS) {
    try {
      await db.insert(catalogMeta).values({ tableName: c.tableName, title: c.title, isCustom: 0 });
    } catch {
      // Ya existe — ignorar conflicto de UNIQUE
    }
  }
}

export async function listCatalogMeta() {
  const db = await getDb();
  return db.select().from(catalogMeta).orderBy(catalogMeta.id);
}

export async function createCatalogTable(tableName: string, title: string) {
  // Validar nombre: solo letras, números y guiones bajos
  if (!/^[a-z0-9_]+$/.test(tableName)) throw new Error("Nombre inválido: solo letras minúsculas, números y guiones bajos");
  const realTable = `catalog_custom_${tableName}`;
  const db = await getDb();
  // Crear tabla dinámica con SQL compatible (PG usa SERIAL, SQLite usa INTEGER PRIMARY KEY)
  if (USE_POSTGRES) {
    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS "${realTable}" (id SERIAL PRIMARY KEY NOT NULL, valor TEXT NOT NULL, activo INTEGER DEFAULT 1 NOT NULL)`));
  } else {
    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS "${realTable}" (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, valor TEXT NOT NULL, activo INTEGER DEFAULT 1 NOT NULL)`));
  }
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
  await db.execute(sql.raw(`DROP TABLE IF EXISTS "${realTable}"`) );
  await db.delete(catalogMeta).where(eq(catalogMeta.tableName, tableName));
}

// --- HELPER GENÉRICO PARA CATÁLOGOS ------------------------------------------

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
  consideraciones: catalogConsideracionesComerciales,
  impl_items: catalogImplementacionItems,
  preventas: catalogPreventas,
  concepto_gasto: catalogConceptosGasto,
  gerencias: catalogGerencias,
  solicitante: catalogSolicitantes,
  flujo_aprobacion: catalogFlujosAprobacion,
  tipo_gasto: catalogTiposGasto,
  proyecto: catalogProyectos,
  tipo_pago: catalogTiposPago,
  especialista_externo: catalogEspecialistasExternos,
  tecnico_interno: catalogTecnicosInternos,
  n_de_acta: catalogNrosActa,
  ejecutivo_atencion_al_cliente: catalogEjecutivosAtencion,
  set: catalogSets,
};

function getCatalogTable(tableName: string) {
  const table = catalogMap[tableName];
  if (table) return table;
  // Tablas dinámicas: usar SQL raw
  return null;
}

// CRUD genérico que soporta tablas fijas (Drizzle) y dinámicas (SQL raw compatible PG+SQLite)
export async function getCatalogListGeneric(tableName: string) {
  const table = catalogMap[tableName];
  const db = await getDb();
  if (table) {
    if (tableName === "impl_items") {
      return db
        .select()
        .from(catalogImplementacionItems)
        .orderBy(asc(catalogImplementacionItems.orden), asc(catalogImplementacionItems.id));
    }
    return db.select().from(table);
  }
  // Tabla dinámica — SQL raw compatible con PG y SQLite
  const realTable = `catalog_custom_${tableName}`;
  try {
    const result = await db.execute(sql.raw(`SELECT * FROM "${realTable}" ORDER BY id`));
    // Drizzle PG devuelve { rows: [...] }, SQLite devuelve array directo
    return Array.isArray(result) ? result : (result as any).rows ?? [];
  } catch {
    return [];
  }
}

export async function createCatalogRecordGeneric(tableName: string, data: any) {
  const table = catalogMap[tableName];
  const db = await getDb();
  if (table) {
    return db.insert(table).values(data).returning();
  }
  const realTable = `catalog_custom_${tableName}`;
  const result = await db.execute(
    sql.raw(`INSERT INTO "${realTable}" (valor, activo) VALUES ('${String(data.valor ?? 'Nuevo').replace(/'/g, "''")}', ${data.activo ?? 1}) RETURNING *`)
  );
  return Array.isArray(result) ? result : (result as any).rows ?? [];
}

export async function updateCatalogRecordGeneric(tableName: string, id: number, data: any) {
  const table = catalogMap[tableName];
  const db = await getDb();
  if (table) {
    return db.update(table).set(data).where(eq(table.id, id));
  }
  const realTable = `catalog_custom_${tableName}`;
  const sets = Object.keys(data).map(k => `"${k}" = '${String((data as any)[k]).replace(/'/g, "''")}' `).join(', ');
  await db.execute(sql.raw(`UPDATE "${realTable}" SET ${sets} WHERE id = ${id}`));
}

export async function deleteCatalogRecordGeneric(tableName: string, id: number) {
  const table = catalogMap[tableName];
  const db = await getDb();
  if (table) {
    return db.delete(table).where(eq(table.id, id));
  }
  const realTable = `catalog_custom_${tableName}`;
  await db.execute(sql.raw(`DELETE FROM "${realTable}" WHERE id = ${id}`));
}

export async function bulkDeleteCatalogRecordsGeneric(tableName: string, ids: number[]) {
  if (!ids.length) return;
  const table = catalogMap[tableName];
  const db = await getDb();
  if (table) {
    return db.delete(table).where(inArray(table.id, ids));
  }
  const realTable = `catalog_custom_${tableName}`;
  await db.execute(sql.raw(`DELETE FROM "${realTable}" WHERE id IN (${ids.join(',')})`) );
}

export async function getCatalogList(tableName: string) {
  const table = getCatalogTable(tableName);
  if (!table) return getCatalogListGeneric(tableName);
  const db = await getDb();
  if (tableName === "impl_items") {
    return db
      .select()
      .from(catalogImplementacionItems)
      .orderBy(asc(catalogImplementacionItems.orden), asc(catalogImplementacionItems.id));
  }
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
  if (tableName === "impl_items") {
    const row = await db
      .select({ key: catalogImplementacionItems.key })
      .from(catalogImplementacionItems)
      .where(eq(catalogImplementacionItems.id, id))
      .limit(1);
    if (row[0]?.key) {
      await db.delete(implementaciones).where(eq(implementaciones.checkKey, row[0].key));
    }
  }
  return await db.delete(table).where(eq(table.id, id));
}

export async function bulkUpdateCatalogRecords(tableName: string, ids: number[], data: any) {
  if (!ids.length) return;
  const table = getCatalogTable(tableName);
  const db = await getDb();
  if (!table) {
    // Tablas dinámicas (catalog_custom_*): SQL raw compatible PG+SQLite
    const realTable = tableName.startsWith('catalog_custom_') ? tableName : `catalog_custom_${tableName}`;
    const sets = Object.keys(data).map(k => `"${k}" = '${String((data as any)[k]).replace(/'/g, "''")}' `).join(', ');
    await db.execute(sql.raw(`UPDATE "${realTable}" SET ${sets} WHERE id IN (${ids.join(',')})`) );
    return;
  }
  return await db.update(table).set(data).where(inArray(table.id, ids));
}

export async function bulkDeleteCatalogRecords(tableName: string, ids: number[]) {
  if (!ids.length) return;
  const table = getCatalogTable(tableName);
  if (!table) return bulkDeleteCatalogRecordsGeneric(tableName, ids);
  const db = await getDb();
  if (tableName === "impl_items") {
    const keyRows = await db
      .select({ key: catalogImplementacionItems.key })
      .from(catalogImplementacionItems)
      .where(inArray(catalogImplementacionItems.id, ids));
    for (const kr of keyRows) {
      if (kr.key) await db.delete(implementaciones).where(eq(implementaciones.checkKey, kr.key));
    }
  }
  return await db.delete(table).where(inArray(table.id, ids));
}

/**
 * Detecta si la tabla users tiene el schema v1 (openId) y la migra al v2 (username/passwordHash).
 * Se ejecuta ANTES de las migraciones de Drizzle para que la BD siempre quede en estado correcto.
 * Es idempotente: si ya tiene el schema v2, no hace nada.
 */
function autoMigrateUsersSchemaIfNeeded(): void {
  // En modo PostgreSQL, las migraciones PG ya manejan el schema correctamente
  if (USE_POSTGRES) {
    console.log("[DB] autoMigrateUsersSchemaIfNeeded: skipped (PostgreSQL mode)");
    return;
  }
  try {
    // Leer las columnas actuales de la tabla users
    const cols = sqlite
      .prepare("SELECT name FROM pragma_table_info('users')")
      .all() as Array<{ name: string }>;
    const colNames = cols.map(c => c.name);

    // Si ya tiene username, el schema es v2 — verificar tablas opcionales
    if (colNames.includes("username")) {
      console.log("[DB] users schema v2 detected — no migration needed");
      // Asegurar que user_roles existe (puede faltar en instalaciones anteriores a RBAC)
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS user_roles (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          userId INTEGER NOT NULL,
          roleId INTEGER NOT NULL,
          assignedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
          UNIQUE(userId, roleId)
        );
      `);
      // Asegurar que las tablas del módulo Gestor de Horarios existen
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS sch_empleados (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          nombre TEXT NOT NULL,
          apellido TEXT NOT NULL,
          cargo TEXT,
          activo INTEGER DEFAULT 1 NOT NULL,
          createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
          updatedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sch_contratos (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          empleadoId INTEGER NOT NULL,
          fechaInicio TEXT NOT NULL,
          fechaFin TEXT,
          horasDiarias REAL NOT NULL,
          diasSemana TEXT NOT NULL,
          tipoDistribucion TEXT DEFAULT 'normal' NOT NULL,
          mismasHorasDiarias INTEGER DEFAULT 1 NOT NULL,
          activo INTEGER DEFAULT 1 NOT NULL,
          createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
          updatedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sch_bloques_horario (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          contratoId INTEGER NOT NULL,
          diaSemana INTEGER NOT NULL,
          horaInicio TEXT NOT NULL,
          horaFin TEXT NOT NULL,
          createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
        );
      `);
      console.log("[DB] Gestor de Horarios tables ensured");
      return;
    }

    // Si tiene openId, es el schema v1 - migrar
    if (colNames.includes("openId")) {
      console.warn("[DB] users schema v1 (openId) detected - migrating to v2 (username/password)...");

      sqlite.exec(`
        -- Renombrar tabla vieja para preservar datos
        ALTER TABLE users RENAME TO users_v1_backup;

        -- Crear tabla roles si no existe
        CREATE TABLE IF NOT EXISTS roles (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          nombre TEXT NOT NULL UNIQUE,
          label TEXT NOT NULL,
          descripcion TEXT,
          activo INTEGER DEFAULT 1 NOT NULL,
          createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
          updatedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
        );

        -- Insertar roles base
        INSERT OR IGNORE INTO roles (nombre, label, descripcion, activo) VALUES
          ('admin',                 'Administrador',        'Acceso total al sistema', 1),
          ('user',                  'Usuario',              'Acceso basico al sistema', 1),
          ('gestor_horarios',       'Gestor de Horarios',   'Acceso al modulo de gestion de horarios', 1),
          ('perfil_full',           'Perfil Full',          'Acceso completo: F1-Acta, F2-EP, Resultados e Implementacion', 1),
          ('perfil_ventas',         'Perfil Ventas',        'Acceso restringido unicamente al modulo F1-Acta', 1),
          ('perfil_implementacion', 'Perfil Implementacion','Acceso restringido unicamente al modulo de Implementacion', 1);

        -- Crear nueva tabla users con schema v2
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          username TEXT NOT NULL UNIQUE,
          passwordHash TEXT NOT NULL,
          displayName TEXT,
          role TEXT DEFAULT 'user' NOT NULL,
          roleId INTEGER,
          isActive INTEGER DEFAULT 1 NOT NULL,
          createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
          updatedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
          lastSignedIn INTEGER
        );

        -- Crear catalog_meta si no existe
        CREATE TABLE IF NOT EXISTS catalog_meta (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          table_name TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          is_custom INTEGER DEFAULT 0 NOT NULL,
          linked_field TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
        );

        -- Crear user_roles si no existe
        CREATE TABLE IF NOT EXISTS user_roles (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          userId INTEGER NOT NULL,
          roleId INTEGER NOT NULL,
          assignedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
          UNIQUE(userId, roleId)
        );
      `);

      console.log("[DB] users schema migrated to v2 successfully. Old data backed up in users_v1_backup.");
      return;
    }

    // Si la tabla no existe aún, no hacer nada - Drizzle la creará
    if (colNames.length === 0) {
      console.log("[DB] users table does not exist yet - will be created by Drizzle migrations");
    }
  } catch (err: any) {
    // Si la tabla no existe, pragma_table_info devuelve vacío sin error - esto no debería ocurrir
    console.warn("[DB] autoMigrateUsersSchemaIfNeeded skipped:", err?.message ?? err);
  }
}

export async function runMigrations() {
  const db = await getDb();

  if (USE_POSTGRES) {
    // ── Modo PostgreSQL: usar migrador PG con migraciones de drizzle/migrations-pg ──
    try {
      await migratePg(db, { migrationsFolder: join(process.cwd(), "drizzle", "migrations-pg") });
      console.log("[DB] PostgreSQL migrations applied successfully");
    } catch (error: any) {
      console.error("[DB] PostgreSQL migration failed:", error?.message ?? error);
      throw error; // En PG no hay fallback — el schema debe estar correcto
    }
    return;
  }

  // ── Modo SQLite: flujo original ──────────────────────────────────────────────
  // Paso 0: Migrar schema viejo automáticamente si es necesario (idempotente)
  autoMigrateUsersSchemaIfNeeded();

  // Paso 1: Intentar migración estándar de Drizzle
  try {
    migrateSqlite(db, { migrationsFolder: join(process.cwd(), "drizzle", "migrations") });
    console.log("[DB] SQLite migrations applied successfully");
  } catch (error: any) {
    // Si la migración falla (ej: BD parcialmente migrada), aplicar schema manualmente
    console.warn("[DB] Migration via Drizzle failed, applying schema manually:", error?.message ?? error);
    try {
      ensureAllProjectTables(sqlite);
      console.log("[DB] Schema applied manually (fallback via schemaBootstrap)");
    } catch (fallbackError) {
      console.error("[DB] Fallback schema creation also failed:", fallbackError);
    }
  }

  try {
    ensureAllProjectTables(sqlite);
    console.log("[DB] All fixed tables ensured (schemaBootstrap)");
  } catch (e: unknown) {
    console.warn("[DB] schemaBootstrap after migrate:", e instanceof Error ? e.message : e);
  }

  // Índices y ALTER TABLE solo para SQLite
  const tryAlter = (sqlStr: string, label: string) => {
    try {
      sqlite.exec(sqlStr);
      console.log(`[DB] ${label}`);
    } catch {
      /* ya aplicado */
    }
  };
  tryAlter(`ALTER TABLE audit_log RENAME COLUMN expedienteCodigo TO actaCodigo`, "Migrate audit_log.expedienteCodigo → actaCodigo");
  tryAlter(`ALTER TABLE catalog_implementacion_items ADD COLUMN descripcion TEXT DEFAULT '' NOT NULL`, "Add catalog_implementacion_items.descripcion");
  tryAlter(`CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(createdAt)`, "Index audit_log createdAt");
  tryAlter(`CREATE INDEX IF NOT EXISTS idx_audit_log_user_created ON audit_log(userId, createdAt)`, "Index audit_log userId+createdAt");
}

// --- USERS (Username/Password) ----------------------------------------------------

export async function getUsers() {
  const db = await getDb();
  return await db.select().from(users);
}
/** @deprecated Usar getUsers */
export const getLocalUsers = getUsers;

export async function createUser(user: typeof users.$inferInsert) {
  const db = await getDb();
  return await db.insert(users).values(user);
}
/** @deprecated Usar createUser */
export const createLocalUser = createUser;

export async function findUserByUsername(username: string) {
  const db = await getDb();
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0];
}
/** @deprecated Usar findUserByUsername */
export const findLocalUserByUsername = findUserByUsername;

export async function findUserById(id: number) {
  const db = await getDb();
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}
/** @deprecated Usar findUserById */
export const findLocalUserById = findUserById;

export async function toggleUserStatus(id: number, isActive: number) {
  const db = await getDb();
  return await db.update(users).set({ isActive }).where(eq(users.id, id));
}
/** @deprecated Usar toggleUserStatus */
export const toggleLocalUserStatus = toggleUserStatus;

export async function updateUser(id: number, data: { displayName?: string; roleId?: number | null; role?: string }) {
  const db = await getDb();
  return await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id));
}

/**
 * Actualiza credenciales de un usuario (username y/o passwordHash).
 * Separado de updateUser intencionalmente: no mezcla datos de perfil con credenciales.
 */
export async function updateUserCredentials(
  id: number,
  data: { username?: string; passwordHash?: string },
): Promise<void> {
  const db = await getDb();
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id));
}

/**
 * Elimina un usuario permanentemente.
 * Solo borra `users` y `user_roles` — los expedientes quedan huérfanos (creadorId sin FK activa).
 * El audit_log se preserva como historial.
 * Prerequisito: verificar isActive === 0 antes de llamar.
 */
export async function deleteUserById(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(userRoles).where(eq(userRoles.userId, id));
  await db.delete(users).where(eq(users.id, id));
}

// --- ROLES --------------------------------------------------------------------

// Roles ocultos (easter egg) — no aparecen en la lista de gestión de usuarios
const HIDDEN_ROLES = ['gestor_horarios'];

export async function getRoles() {
  const db = await getDb();
  const all = await db.select().from(roles).orderBy(roles.id);
  return all.filter(r => !HIDDEN_ROLES.includes(r.nombre));
}

export async function getRoleById(id: number) {
  const db = await getDb();
  const result = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  return result[0];
}

export async function createRole(data: InsertRole) {
  const db = await getDb();
  return await db.insert(roles).values(data).returning();
}

export async function updateRole(id: number, data: Partial<InsertRole>) {
  const db = await getDb();
  return await db.update(roles).set({ ...data, updatedAt: new Date() }).where(eq(roles.id, id));
}

export async function deleteRole(id: number) {
  const db = await getDb();
  return await db.delete(roles).where(eq(roles.id, id));
}

export async function getUsersByRoleId(roleId: number) {
  const db = await getDb();
  return await db.select({ id: users.id, username: users.username, displayName: users.displayName })
    .from(users)
    .where(eq(users.roleId, roleId));
}

// ─── USER_ROLES (RBAC N:N) ──────────────────────────────────────────────────

/** Obtiene todos los roles asignados a un usuario */
export async function getUserRoles(userId: number): Promise<UserRole[]> {
  const db = await getDb();
  return await db.select().from(userRoles).where(eq(userRoles.userId, userId));
}

/** Obtiene los nombres de roles de un usuario (join con tabla roles) */
export async function getUserRoleNames(userId: number): Promise<string[]> {
  const db = await getDb();
  const result = await db
    .select({ nombre: roles.nombre })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
  return result.map(r => r.nombre);
}

/** Asigna un rol a un usuario (idempotente — ignora si ya existe) */
export async function assignRoleToUser(userId: number, roleId: number): Promise<void> {
  const db = await getDb();
  await db.insert(userRoles).values({ userId, roleId }).onConflictDoNothing();
}

/** Revoca un rol de un usuario */
export async function revokeRoleFromUser(userId: number, roleId: number): Promise<void> {
  const db = await getDb();
  await db.delete(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
}

/** Reemplaza todos los roles de un usuario por un nuevo set */
export async function setUserRoles(userId: number, roleIds: number[]): Promise<void> {
  const db = await getDb();
  // Borrar todos los roles actuales del usuario
  await db.delete(userRoles).where(eq(userRoles.userId, userId));
  // Insertar los nuevos
  if (roleIds.length > 0) {
    await db.insert(userRoles).values(roleIds.map(roleId => ({ userId, roleId })));
  }
}

/** Verifica si un usuario tiene un rol específico */
export async function userHasRole(userId: number, roleName: string): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, userId), eq(roles.nombre, roleName)))
    .limit(1);
  return result.length > 0;
}

/** Verifica si un usuario tiene al menos uno de los roles dados */
export async function userHasAnyRole(userId: number, roleNames: string[]): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, userId), inArray(roles.nombre, roleNames)))
    .limit(1);
  return result.length > 0;
}

/**
 * Easter egg: toggle del rol gestor_horarios para el usuario actual.
 * Si ya lo tiene → lo quita. Si no lo tiene → lo asigna.
 * Devuelve { active: true } si quedó con el rol, { active: false } si se lo quitó.
 */
export async function toggleHorariosEasterEgg(userId: number): Promise<{ active: boolean }> {
  const db = await getDb();
  // Buscar el id del rol gestor_horarios
  const roleRow = await db.select({ id: roles.id })
    .from(roles).where(eq(roles.nombre, 'gestor_horarios')).limit(1);
  if (!roleRow.length) throw new Error('Rol gestor_horarios no encontrado');
  const roleId = roleRow[0].id;
  const hasIt = await userHasRole(userId, 'gestor_horarios');
  if (hasIt) {
    await revokeRoleFromUser(userId, roleId);
    return { active: false };
  } else {
    await assignRoleToUser(userId, roleId);
    return { active: true };
  }
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

/** Busca un acta por el id del expediente. */
export async function getActaByExpedienteId(expedienteId: number) {
  const db = await getDb();
  const result = await db.select().from(actas).where(eq(actas.expedienteId, expedienteId)).limit(1);
  return result[0] ?? null;
}

// --- Evaluaciones de Proyecto -------------------------------------------------
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

export async function getEvaluacionByExpedienteId(expedienteId: number) {
  const db = await getDb();
  const r = await db.select().from(evaluaciones).where(eq(evaluaciones.expedienteId, expedienteId)).limit(1);
  return r[0] ?? null;
}

export async function getResultadoByExpedienteId(expedienteId: number) {
  const db = await getDb();
  const r = await db.select().from(resultadosExpediente).where(eq(resultadosExpediente.expedienteId, expedienteId)).limit(1);
  return r[0] ?? null;
}

export async function upsertResultadoExpediente(data: {
  expedienteId: number;
  payload: unknown;
  f3FormStatus: string;
}) {
  const db = await getDb();
  const now = new Date();
  await db
    .insert(resultadosExpediente)
    .values({
      expedienteId: data.expedienteId,
      payload: data.payload as InsertResultadoExpediente["payload"],
      f3FormStatus: data.f3FormStatus,
      f3SavedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: resultadosExpediente.expedienteId,
      set: {
        payload: data.payload as InsertResultadoExpediente["payload"],
        f3FormStatus: data.f3FormStatus,
        f3SavedAt: now,
        updatedAt: now,
      },
    });
  return getResultadoByExpedienteId(data.expedienteId);
}

export async function listImplementacionesByExpedienteId(expedienteId: number) {
  const db = await getDb();
  return db
    .select({ checkKey: implementaciones.checkKey, estado: implementaciones.estado })
    .from(implementaciones)
    .where(eq(implementaciones.expedienteId, expedienteId));
}

export async function upsertImplementacionCheck(expedienteId: number, checkKey: string, estado: boolean) {
  const db = await getDb();
  const now = new Date();
  const val = estado ? 1 : 0;
  const existing = await db
    .select({ id: implementaciones.id })
    .from(implementaciones)
    .where(and(eq(implementaciones.expedienteId, expedienteId), eq(implementaciones.checkKey, checkKey)))
    .limit(1);
  if (existing[0]) {
    await db
      .update(implementaciones)
      .set({ estado: val, updatedAt: now })
      .where(eq(implementaciones.id, existing[0].id));
  } else {
    await db.insert(implementaciones).values({
      expedienteId,
      checkKey,
      estado: val,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function listImplementacionCatalogActivos() {
  const db = await getDb();
  return db
    .select({
      key: catalogImplementacionItems.key,
      orden: catalogImplementacionItems.orden,
      label: catalogImplementacionItems.label,
      descripcion: catalogImplementacionItems.descripcion,
    })
    .from(catalogImplementacionItems)
    .where(eq(catalogImplementacionItems.activo, 1))
    .orderBy(asc(catalogImplementacionItems.orden), asc(catalogImplementacionItems.id));
}

export async function isActiveImplementacionCatalogKey(key: string) {
  const db = await getDb();
  const r = await db
    .select({ id: catalogImplementacionItems.id })
    .from(catalogImplementacionItems)
    .where(and(eq(catalogImplementacionItems.key, key), eq(catalogImplementacionItems.activo, 1)))
    .limit(1);
  return !!r[0];
}

/**
 * Elimina expediente y todo su contenido vinculado por expedienteId.
 */
export async function deleteExpedienteCascadeById(id: number) {
  const db = await getDb();
  await db.delete(implementaciones).where(eq(implementaciones.expedienteId, id));
  await db.delete(resultadosExpediente).where(eq(resultadosExpediente.expedienteId, id));
  await db.delete(evaluaciones).where(eq(evaluaciones.expedienteId, id));
  await db.delete(actas).where(eq(actas.expedienteId, id));
  await db.delete(expedientes).where(eq(expedientes.id, id));
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


// --- GESTOR DE HORARIOS -------------------------------------------------------

// Empleados
export async function getEmpleados(): Promise<SchEmpleado[]> {
  const db = await getDb();
  return db.select().from(schEmpleados).orderBy(schEmpleados.apellido, schEmpleados.nombre);
}

export async function getEmpleadoById(id: number): Promise<SchEmpleado | undefined> {
  const db = await getDb();
  const result = await db.select().from(schEmpleados).where(eq(schEmpleados.id, id)).limit(1);
  return result[0];
}

export async function createEmpleado(data: InsertSchEmpleado): Promise<SchEmpleado> {
  const db = await getDb();
  const result = await db.insert(schEmpleados).values(data).returning();
  return result[0];
}

export async function updateEmpleado(id: number, data: Partial<InsertSchEmpleado>): Promise<void> {
  const db = await getDb();
  await db.update(schEmpleados).set({ ...data, updatedAt: new Date() }).where(eq(schEmpleados.id, id));
}

export async function toggleEmpleadoStatus(id: number, activo: number): Promise<void> {
  const db = await getDb();
  await db.update(schEmpleados).set({ activo, updatedAt: new Date() }).where(eq(schEmpleados.id, id));
}

/**
 * Elimina un empleado y todos sus datos relacionados en cascada:
 * bloques de horario → contratos → empleado
 */
export async function deleteEmpleado(id: number): Promise<void> {
  const db = await getDb();
  // 1. Obtener todos los contratos del empleado
  const contratos = await db.select({ id: schContratos.id })
    .from(schContratos)
    .where(eq(schContratos.empleadoId, id));
  // 2. Eliminar bloques de todos sus contratos
  if (contratos.length > 0) {
    const contratoIds = contratos.map(c => c.id);
    await db.delete(schBloquesHorario).where(inArray(schBloquesHorario.contratoId, contratoIds));
  }
  // 3. Eliminar contratos
  await db.delete(schContratos).where(eq(schContratos.empleadoId, id));
  // 4. Eliminar empleado
  await db.delete(schEmpleados).where(eq(schEmpleados.id, id));
}

// Contratos
export async function getContratosByEmpleado(empleadoId: number): Promise<SchContrato[]> {
  const db = await getDb();
  return db.select().from(schContratos)
    .where(eq(schContratos.empleadoId, empleadoId))
    .orderBy(desc(schContratos.createdAt));
}

export async function getContratoActivoByEmpleado(empleadoId: number): Promise<SchContrato | undefined> {
  const db = await getDb();
  const result = await db.select().from(schContratos)
    .where(and(eq(schContratos.empleadoId, empleadoId), eq(schContratos.activo, 1)))
    .limit(1);
  return result[0];
}

export async function createContrato(data: InsertSchContrato): Promise<SchContrato> {
  const db = await getDb();
  // Desactivar contratos anteriores del mismo empleado
  await db.update(schContratos)
    .set({ activo: 0 })
    .where(eq(schContratos.empleadoId, data.empleadoId));
  const result = await db.insert(schContratos).values({ ...data, activo: 1 }).returning();
  return result[0];
}

export async function updateContrato(id: number, data: Partial<InsertSchContrato>): Promise<void> {
  const db = await getDb();
  await db.update(schContratos).set({ ...data, updatedAt: new Date() }).where(eq(schContratos.id, id));
}

// Bloques de horario
export async function getBloquesByContrato(contratoId: number): Promise<SchBloqueHorario[]> {
  const db = await getDb();
  return db.select().from(schBloquesHorario)
    .where(eq(schBloquesHorario.contratoId, contratoId))
    .orderBy(schBloquesHorario.diaSemana, schBloquesHorario.horaInicio);
}

export async function setBloques(contratoId: number, bloques: Omit<InsertSchBloqueHorario, "contratoId">[]): Promise<void> {
  const db = await getDb();
  // Reemplazar todos los bloques del contrato
  await db.delete(schBloquesHorario).where(eq(schBloquesHorario.contratoId, contratoId));
  if (bloques.length > 0) {
    await db.insert(schBloquesHorario).values(bloques.map(b => ({ ...b, contratoId })));
  }
}

// Vista semanal: obtener todos los bloques activos de la semana con info del empleado
export async function getBloquesSemanales(): Promise<Array<SchBloqueHorario & { empleadoId: number; empleadoNombre: string; empleadoApellido: string }>> {
  const db = await getDb();
  const result = await db
    .select({
      id: schBloquesHorario.id,
      contratoId: schBloquesHorario.contratoId,
      diaSemana: schBloquesHorario.diaSemana,
      horaInicio: schBloquesHorario.horaInicio,
      horaFin: schBloquesHorario.horaFin,
      createdAt: schBloquesHorario.createdAt,
      empleadoId: schEmpleados.id,
      empleadoNombre: schEmpleados.nombre,
      empleadoApellido: schEmpleados.apellido,
    })
    .from(schBloquesHorario)
    .innerJoin(schContratos, eq(schBloquesHorario.contratoId, schContratos.id))
    .innerJoin(schEmpleados, eq(schContratos.empleadoId, schEmpleados.id))
    .where(and(eq(schContratos.activo, 1), eq(schEmpleados.activo, 1)))
    .orderBy(schBloquesHorario.diaSemana, schBloquesHorario.horaInicio);
  return result;
}

// ─── MÓDULO: EXPEDIENTES ──────────────────────────────────────────────────────

/**
 * Crea un expediente en BD.
 * Ya no genera uuid ni nro_acta — el id auto-increment es el único identificador.
 */
export async function createExpediente(data: { nombre: string; creadorId: number }) {
  const db = await getDb();
  const result = await db.insert(expedientes).values({
    nombre: data.nombre,
    creadorId: data.creadorId,
    status: "borrador",
  }).returning();
  return result[0];
}

/**
 * Crea un expediente con su acta (F1) en una misma operación.
 * El N° de Acta se asigna automáticamente como consecutivo (MAX+1).
 */
export async function crearExpedienteConActa(data: { nombre: string; creadorId: number }) {
  const db = await getDb();
  const now = new Date();
  // 1. Crear expediente
  const exp = await createExpediente(data);
  // 2. Calcular nro_acta consecutivo
  const maxRow = await db
    .select({ max: sql<number>`MAX(nro_acta)` })
    .from(actas)
    .limit(1);
  // Garantizar que el primer nroActa sea al menos 10001
  const nextNroActa = Math.max((maxRow[0]?.max ?? 0) + 1, 10001);
  const codigo = buildActaCodigo("", nextNroActa);
  // 3. Crear acta (F1) vinculada
  const acta = await db.insert(actas).values({
    userId: data.creadorId,
    expedienteId: exp.id,
    nroActa: nextNroActa,
    codigo,
    noActa: codigo,
    status: "borrador",
    f1FormStatus: "nuevo",
    createdAt: now,
    updatedAt: now,
  }).returning();
  return { expediente: exp, acta: acta[0] };
}

/** Obtiene todos los expedientes (para admin/full). */
export async function getExpedientes() {
  const db = await getDb();
  return db.select().from(expedientes).orderBy(desc(expedientes.createdAt));
}

/** Obtiene solo los expedientes activos (no en papelera) de un usuario específico. */
export async function getExpedientesByUser(userId: number) {
  const db = await getDb();
  return db.select().from(expedientes)
    .where(and(eq(expedientes.creadorId, userId), sql`deleted_at IS NULL`))
    .orderBy(desc(expedientes.createdAt));
}

/** Obtiene expedientes en papelera de un usuario específico. */
export async function getExpedientesEnPapelera(userId: number) {
  const db = await getDb();
  return db.select().from(expedientes)
    .where(and(eq(expedientes.creadorId, userId), sql`deleted_at IS NOT NULL`))
    .orderBy(desc(expedientes.updatedAt));
}

/** Mueve un expediente a la papelera (soft-delete). */
export async function moverExpedienteAPapelera(id: number) {
  const db = await getDb();
  const now = Math.floor(Date.now() / 1000);
  const result = await db.update(expedientes)
    .set({ deletedAt: now, updatedAt: new Date() })
    .where(eq(expedientes.id, id))
    .returning();
  return result[0] ?? null;
}

/** Restaura un expediente desde la papelera. */
export async function restaurarExpedienteDePapelera(id: number) {
  const db = await getDb();
  const result = await db.update(expedientes)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(expedientes.id, id))
    .returning();
  return result[0] ?? null;
}

export async function getExpedienteById(id: number) {
  const db = await getDb();
  const result = await db.select().from(expedientes).where(eq(expedientes.id, id)).limit(1);
  return result[0] ?? null;
}

/** Actualiza el nombre o status de un expediente. */
export async function updateExpediente(id: number, data: Partial<Pick<Expediente, "nombre" | "status">>) {
  const db = await getDb();
  const result = await db.update(expedientes)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(expedientes.id, id))
    .returning();
  return result[0] ?? null;
}

/** Elimina un expediente por id (solo la fila expedientes; preferir deleteExpedienteCascadeById). */
export async function deleteExpediente(id: number) {
  const db = await getDb();
  await db.delete(expedientes).where(eq(expedientes.id, id));
}

/** Lista expedientes del usuario con acta/eval/resultado (N consultas por fila). */
export async function listExpedientesResumen(userId: number) {
  const list = await getExpedientesByUser(userId);
  const rows: Array<{
    expediente: Expediente;
    acta: typeof actas.$inferSelect | null;
    evaluacion: typeof evaluaciones.$inferSelect | null;
    resultado: ResultadoExpediente | null;
  }> = [];
  for (const e of list) {
    const acta = await getActaByExpedienteId(e.id);
    const evaluacion = await getEvaluacionByExpedienteId(e.id);
    const resultado = await getResultadoByExpedienteId(e.id);
    rows.push({ expediente: e, acta, evaluacion, resultado });
  }
  return rows;
}

/** Detalle solo si el expediente pertenece al usuario (creadorId). */
export async function getExpedienteDetalle(id: number, userId: number) {
  const exp = await getExpedienteById(id);
  if (!exp || exp.creadorId !== userId) return null;
  const acta = await getActaByExpedienteId(id);
  const evaluacion = await getEvaluacionByExpedienteId(id);
  const resultado = await getResultadoByExpedienteId(id);
  return { expediente: exp, acta, evaluacion, resultado };
}

/** Detalle sin filtrar por dueño (solo uso con autorización workspace global en routers). */
export async function getExpedienteDetalleGlobal(id: number) {
  const exp = await getExpedienteById(id);
  if (!exp) return null;
  const acta = await getActaByExpedienteId(id);
  const evaluacion = await getEvaluacionByExpedienteId(id);
  const resultado = await getResultadoByExpedienteId(id);
  return { expediente: exp, acta, evaluacion, resultado };
}

/** Listado resumen de todos los expedientes (solo autorización en capa HTTP/tRPC). */
export async function listExpedientesResumenGlobal() {
  const list = await getExpedientes();
  const rows: Array<{
    expediente: Expediente;
    acta: typeof actas.$inferSelect | null;
    evaluacion: typeof evaluaciones.$inferSelect | null;
    resultado: ResultadoExpediente | null;
  }> = [];
  for (const e of list) {
    const acta = await getActaByExpedienteId(e.id);
    const evaluacion = await getEvaluacionByExpedienteId(e.id);
    const resultado = await getResultadoByExpedienteId(e.id);
    rows.push({ expediente: e, acta, evaluacion, resultado });
  }
  return rows;
}

// ─── MÓDULO: AUDIT LOG ────────────────────────────────────────────────────────

/**
 * Registra una entrada en el audit log.
 * Llamar desde los procedures tRPC después de cada acción relevante.
 */
export async function createAuditLog(data: {
  userId?: number;
  username: string;
  action: string;
  entity: string;
  entityId?: number;
  expedienteId?: number | null;
  actaCodigo?: string | null;
  changes?: { before?: unknown; after?: unknown };
  ip?: string;
}) {
  const db = await getDb();
  await db.insert(auditLog).values({
    userId: data.userId ?? null,
    username: data.username,
    action: data.action,
    entity: data.entity,
    entityId: data.entityId ?? null,
    expedienteId: data.expedienteId ?? null,
    actaCodigo: data.actaCodigo ?? null,
    changes: data.changes ?? null,
    ip: data.ip ?? null,
  });
}

export type AuditLogQueryFilter = {
  from?: Date;
  to?: Date;
  actions?: string[];
  entities?: string[];
  userId?: number;
  usernameContains?: string;
  expedienteId?: number;
  limit: number;
  cursor?: { id: number; createdAt: Date };
};

function likeFragment(raw: string): string {
  const safe = raw.replace(/[%_\\]/g, "");
  return `%${safe}%`;
}

/** Lista audit con filtros en SQL + paginación por cursor (createdAt desc, id desc). */
export async function getAuditLogFiltered(f: AuditLogQueryFilter) {
  const db = await getDb();
  const conditions = [];

  if (f.from) conditions.push(gte(auditLog.createdAt, f.from));
  if (f.to) conditions.push(lte(auditLog.createdAt, f.to));
  if (f.actions?.length) conditions.push(inArray(auditLog.action, f.actions));
  if (f.entities?.length) conditions.push(inArray(auditLog.entity, f.entities));
  if (f.userId != null) conditions.push(eq(auditLog.userId, f.userId));
  if (f.usernameContains?.trim()) {
    conditions.push(like(auditLog.username, likeFragment(f.usernameContains.trim())));
  }
  if (f.expedienteId != null) {
    conditions.push(eq(auditLog.expedienteId, f.expedienteId));
  }

  if (f.cursor) {
    const cAt = f.cursor.createdAt;
    const cId = f.cursor.id;
    conditions.push(
      or(lt(auditLog.createdAt, cAt), and(eq(auditLog.createdAt, cAt), lt(auditLog.id, cId)))
    );
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;
  const limit = Math.min(Math.max(f.limit, 1), 500);

  const rows = await db
    .select()
    .from(auditLog)
    .where(whereClause)
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last
      ? { id: last.id, createdAt: last.createdAt instanceof Date ? last.createdAt : new Date(last.createdAt) }
      : undefined;

  return { items, nextCursor };
}


