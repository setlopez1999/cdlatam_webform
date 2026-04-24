// server/db.ts
import { eq, like, or, and, sql, desc, sum, count, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
// Importamos los esquemas (asegúrate de que esta ruta sea correcta)
import {
  InsertUser, users, roles, type Role, type InsertRole,
  userRoles, type UserRole, type InsertUserRole,
  actas, evaluaciones, InsertActa, InsertEvaluacion,
  catalogMeta,
  // Catálogos
  catalogMonedas, catalogPaises, catalogEmpresas, catalogDocumentoIdentidad,
  catalogUnidadesNegocio, catalogSoluciones, catalogDetalleServicio,
  catalogTipoVenta, catalogPlazos, catalogDocumentos, catalogCecos,
  catalogDepartamentos, catalogAreas, catalogNombres,
  // Gestor de Horarios
  schEmpleados, type SchEmpleado, type InsertSchEmpleado,
  schContratos, type SchContrato, type InsertSchContrato,
  schBloquesHorario, type SchBloqueHorario, type InsertSchBloqueHorario,
  // Expedientes y Auditoría
  expedientes, type Expediente, type InsertExpediente,
  auditLog, type InsertAuditLog,
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
  if (!table) {
    // Tablas dinámicas (catalog_custom_*): usar SQL raw
    const realTable = tableName.startsWith('catalog_custom_') ? tableName : `catalog_custom_${tableName}`;
    const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const placeholders = ids.map(() => '?').join(',');
    const vals = [...Object.values(data), ...ids];
    sqlite.prepare(`UPDATE "${realTable}" SET ${sets} WHERE id IN (${placeholders})`).run(...vals);
    return;
  }
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

/**
 * Detecta si la tabla users tiene el schema v1 (openId) y la migra al v2 (username/passwordHash).
 * Se ejecuta ANTES de las migraciones de Drizzle para que la BD siempre quede en estado correcto.
 * Es idempotente: si ya tiene el schema v2, no hace nada.
 */
function autoMigrateUsersSchemaIfNeeded(): void {
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
          ('manager',               'Gerente',              'Puede ver todo, no puede gestionar usuarios', 1),
          ('viewer',                'Solo lectura',         'Acceso de solo lectura', 1),
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
  // Paso 0: Migrar schema viejo automáticamente si es necesario (idempotente)
  autoMigrateUsersSchemaIfNeeded();

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
        CREATE TABLE IF NOT EXISTS roles (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          nombre TEXT NOT NULL UNIQUE,
          label TEXT NOT NULL DEFAULT '',
          descripcion TEXT,
          activo INTEGER DEFAULT 1 NOT NULL,
          createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
          updatedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
        );
        CREATE TABLE IF NOT EXISTS users (
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
        CREATE TABLE IF NOT EXISTS catalog_meta (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          table_name TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          is_custom INTEGER DEFAULT 0 NOT NULL,
          linked_field TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
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
        CREATE TABLE IF NOT EXISTS user_roles (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          userId INTEGER NOT NULL,
          roleId INTEGER NOT NULL,
          assignedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
          UNIQUE(userId, roleId)
        );
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
      console.log("[DB] Schema applied manually (fallback)");
    } catch (fallbackError) {
      console.error("[DB] Fallback schema creation also failed:", fallbackError);
    }
  }
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

// --- ROLES --------------------------------------------------------------------

export async function getRoles() {
  const db = await getDb();
  return await db.select().from(roles).orderBy(roles.id);
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
 * Crea un expediente en BD con su metadata.
 * Los datos de formulario (F1/F2) siguen en localStorage por ahora.
 */
export async function createExpediente(data: { uuid: string; nombre: string; creadorId: number }) {
  const db = await getDb();
  const result = await db.insert(expedientes).values({
    uuid: data.uuid,
    nombre: data.nombre,
    creadorId: data.creadorId,
    status: "borrador",
  }).returning();
  return result[0];
}

/** Obtiene todos los expedientes (para admin/full). */
export async function getExpedientes() {
  const db = await getDb();
  return db.select().from(expedientes).orderBy(desc(expedientes.createdAt));
}

/** Obtiene solo los expedientes de un usuario específico. */
export async function getExpedientesByUser(userId: number) {
  const db = await getDb();
  return db.select().from(expedientes)
    .where(eq(expedientes.creadorId, userId))
    .orderBy(desc(expedientes.createdAt));
}

/** Busca un expediente por su uuid (nanoid del store de Zustand). */
export async function getExpedienteByUuid(uuid: string) {
  const db = await getDb();
  const result = await db.select().from(expedientes).where(eq(expedientes.uuid, uuid)).limit(1);
  return result[0] ?? null;
}

/** Actualiza el nombre o status de un expediente. */
export async function updateExpediente(id: number, data: Partial<Pick<Expediente, "nombre" | "status" | "actaId" | "evaluacionId">>) {
  const db = await getDb();
  const result = await db.update(expedientes)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(expedientes.id, id))
    .returning();
  return result[0] ?? null;
}

/** Elimina un expediente por id. */
export async function deleteExpediente(id: number) {
  const db = await getDb();
  await db.delete(expedientes).where(eq(expedientes.id, id));
}

// ─── MÓDULO: AUDIT LOG ────────────────────────────────────────────────────────

/**
 * Registra una entrada en el audit log.
 * Llamar desde los procedures tRPC después de cada acción relevante.
 */
export async function createAuditLog(data: {
  userId?: number;
  username: string;
  action: "LOGIN" | "LOGOUT" | "CREATE" | "UPDATE" | "DELETE";
  entity: string;
  entityId?: number;
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
    changes: data.changes ?? null,
    ip: data.ip ?? null,
  });
}

/** Obtiene el audit log completo, ordenado por más reciente. */
export async function getAuditLog(limit = 200) {
  const db = await getDb();
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);
}
