import { eq, inArray, and } from "drizzle-orm";
import { getDb } from "./db";
import { catalogClausulas, catalogUnidadesNegocio } from "../drizzle/schema";
import type { CatalogClausula, InsertCatalogClausula } from "../drizzle/schema";

// ─── Queries ─────────────────────────────────────────────────────
export const getClausulas = async () => {
  const db = await getDb();
  return db.select().from(catalogClausulas).orderBy(catalogClausulas.valor);
};

export const getClausulaById = async (id: number) => {
  const db = await getDb();
  const results = await db.select().from(catalogClausulas).where(eq(catalogClausulas.id, id));
  return results[0] ?? null;
};

export const getClausulasByUnidadNegocio = async (unidadNegocioId: number) => {
  const db = await getDb();
  return db.select().from(catalogClausulas)
    .where(eq(catalogClausulas.unidadNegocioId, unidadNegocioId))
    .orderBy(catalogClausulas.valor);
};

/**
 * Devuelve cláusulas activas (activo=1) cuyo `unidadNegocioId` esté en `ids`.
 * Lo usa el procedure público `clausulas.getByUnidades` para que F1 anexe los
 * PDFs correctos al exportar el Acta. Si `ids` está vacío, retorna []  para
 * evitar pegarle a la BD inútilmente.
 */
export const getClausulasByUnidades = async (ids: number[]) => {
  if (ids.length === 0) return [];
  const db = await getDb();
  return db.select().from(catalogClausulas)
    .where(and(
      inArray(catalogClausulas.unidadNegocioId, ids),
      eq(catalogClausulas.activo, 1),
    ))
    .orderBy(catalogClausulas.valor);
};

// ─── Mutations ───────────────────────────────────────────────────
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

export const toggleSiempreIncluir = async (id: number, siempreIncluir: number) => {
  const db = await getDb();
  return db.update(catalogClausulas).set({ siempreIncluir }).where(eq(catalogClausulas.id, id)).returning();
};

/** Devuelve cláusulas activas que siempre se incluyen (siempre_incluir=1), sin importar unidad. */
export const getClausulasSiempreIncluir = async () => {
  const db = await getDb();
  return db.select().from(catalogClausulas)
    .where(and(
      eq(catalogClausulas.siempreIncluir, 1),
      eq(catalogClausulas.activo, 1),
    ))
    .orderBy(catalogClausulas.valor);
};

// ─── Utilidad: Obtener unidades de negocio para el select ───────────────────────
export const getUnidadesNegocioForSelect = async () => {
  const db = await getDb();
  return db.select({ id: catalogUnidadesNegocio.id, valor: catalogUnidadesNegocio.valor })
    .from(catalogUnidadesNegocio)
    .where(eq(catalogUnidadesNegocio.activo, 1))
    .orderBy(catalogUnidadesNegocio.valor);
};
