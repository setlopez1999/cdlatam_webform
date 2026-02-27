import { eq, desc, like, and, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, actas, evaluaciones, InsertActa, InsertEvaluacion } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

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
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Actas ────────────────────────────────────────────────────────────────────

/**
 * Obtiene todas las actas de un usuario ordenadas por fecha de creación.
 * TODO: Conectar con API de Base de Datos aquí para paginación avanzada.
 */
export async function getActasByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(actas).where(eq(actas.userId, userId)).orderBy(desc(actas.createdAt));
}

/**
 * Obtiene una acta por ID.
 * TODO: Conectar con API de Base de Datos aquí para validación de permisos.
 */
export async function getActaById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(actas).where(eq(actas.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Crea una nueva acta.
 * TODO: Conectar con API de Base de Datos aquí para auditoría y notificaciones.
 */
export async function createActa(data: InsertActa) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(actas).values(data);
  return result;
}

/**
 * Actualiza una acta existente.
 * TODO: Conectar con API de Base de Datos aquí para historial de cambios.
 */
export async function updateActa(id: number, data: Partial<InsertActa>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(actas).set(data).where(eq(actas.id, id));
}

/**
 * Elimina una acta.
 */
export async function deleteActa(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(actas).where(eq(actas.id, id));
}

// ─── Evaluaciones de Proyecto ─────────────────────────────────────────────────

/**
 * Obtiene todas las evaluaciones de un usuario.
 * TODO: Conectar con API de Base de Datos aquí para filtros avanzados.
 */
export async function getEvaluacionesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(evaluaciones).where(eq(evaluaciones.userId, userId)).orderBy(desc(evaluaciones.createdAt));
}

/**
 * Obtiene una evaluación por ID.
 */
export async function getEvaluacionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(evaluaciones).where(eq(evaluaciones.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Crea una nueva evaluación de proyecto.
 * TODO: Conectar con API de Base de Datos aquí para auto-generación de código de proyecto.
 */
export async function createEvaluacion(data: InsertEvaluacion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(evaluaciones).values(data);
}

/**
 * Actualiza una evaluación existente.
 * TODO: Conectar con API de Base de Datos aquí para recalcular Formulario 3 automáticamente.
 */
export async function updateEvaluacion(id: number, data: Partial<InsertEvaluacion>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(evaluaciones).set(data).where(eq(evaluaciones.id, id));
}

/**
 * Elimina una evaluación.
 */
export async function deleteEvaluacion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(evaluaciones).where(eq(evaluaciones.id, id));
}

/**
 * Búsqueda de registros en la base de datos (actas + evaluaciones).
 * TODO: Conectar con API de Base de Datos aquí para búsqueda full-text avanzada.
 */
export async function searchRegistros(userId: number, query: string) {
  const db = await getDb();
  if (!db) return { actas: [], evaluaciones: [] };

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
