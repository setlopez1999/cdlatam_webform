import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { catalogClausulas, catalogSoluciones } from "../drizzle/schema";
import type { CatalogClausula, InsertCatalogClausula } from "../drizzle/schema";

// ─── Queries ─────────────────────────────────────────────────────────────
export const getClausulas = async () => {
  const db = await getDb();
  return db.select().from(catalogClausulas).orderBy(catalogClausulas.valor);
};

export const getClausulaById = async (id: number) => {
  const db = await getDb();
  const results = await db.select().from(catalogClausulas).where(eq(catalogClausulas.id, id));
  return results[0] ?? null;
};

export const getClausulasBySolucion = async (solucionId: number) => {
  const db = await getDb();
  return db.select().from(catalogClausulas)
    .where(eq(catalogClausulas.solucionId, solucionId))
    .orderBy(catalogClausulas.valor);
};

// ─── Mutations ───────────────────────────────────────────────────────────
export const createClausula = async (data: InsertCatalogClausula) => {
  const db = await getDb();
  return db.insert(catalogClausulas).values(data).returning();
};

export const updateClausula = async (id: number, data: Partial<InsertCatalogClausula>) => {
  const db = await getDb();
  return db.update(catalogClausulas).set(data).where(eq(catalogClausulas.id, id)).returning();
};

export const deleteClausula = async (id: number) => {
  const db = await getDb();
  return db.delete(catalogClausulas).where(eq(catalogClausulas.id, id)).returning();
};

export const toggleClausulaStatus = async (id: number, activo: number) => {
  const db = await getDb();
  return db.update(catalogClausulas).set({ activo }).where(eq(catalogClausulas.id, id)).returning();
};

// ─── Utilidad: Obtener soluciones para el select ───────────────────────
export const getSolucionesForSelect = async () => {
  const db = await getDb();
  return db.select({ id: catalogSoluciones.id, valor: catalogSoluciones.valor })
    .from(catalogSoluciones)
    .where(eq(catalogSoluciones.activo, 1))
    .orderBy(catalogSoluciones.valor);
};
