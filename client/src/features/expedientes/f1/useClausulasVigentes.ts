/**
 * useClausulasVigentes
 *
 * Resuelve las cláusulas legales que aplican a F1 según las unidades de
 * negocio presentes en `serviciosContratados`. Es la fuente de verdad para:
 *   - El listado "Cláusulas legales adjuntas (auto)" en F1Consideraciones.
 *   - Los PDFs que se anexan al final del Acta exportada en pdfExport.ts.
 *
 * Pasos:
 *   1. Resuelve `unidadNegocioId` numérico para cada servicio mapeando su
 *      `unidadNegocio` (string `value`) contra el catálogo de unidades.
 *   2. Deduplica los ids con un Set (no consultar dos veces la misma unidad).
 *   3. Llama al procedure público `clausulas.getByUnidades` (devuelve solo
 *      activas, campos mínimos).
 *   4. Deduplica los resultados por `clausula.id` (una cláusula podría estar
 *      asignada a varias unidades en el futuro).
 *
 * Si pasas `catalogs` desde el padre (p. ej. mismo resultado que `catalogs.getAll`),
 * no se suscribe a una segunda query de catálogos en este hook.
 */
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import type { ServicioContratado } from "../types";

export interface ClausulaVigente {
  id: number;
  valor: string;
  filePath: string;
  fileName: string;
  unidadNegocioId: number | null;
}

/** Fragmento mínimo del catálogo necesario para resolver unidades de negocio. */
export type CatalogsUnidadesSlice = {
  unidadesNegocio?: ReadonlyArray<{ value: string; id?: number }>;
};

/** Estado expuesto para pasar a F1Consideraciones sin duplicar el hook. */
export interface ClausulasVigentesState {
  clausulas: ClausulaVigente[];
  isLoading: boolean;
  hasUnidades: boolean;
}

export function useClausulasVigentes(
  servicios: ServicioContratado[] | undefined,
  /** Si viene del padre (p. ej. `useQuery` de getAll), evita otra query aquí. */
  catalogs?: CatalogsUnidadesSlice | null,
): ClausulasVigentesState {
  const fallbackCatalogs = trpc.catalogs.getAll.useQuery(undefined, {
    enabled: catalogs === undefined,
  });

  const catalogsResolved = catalogs ?? fallbackCatalogs.data;

  const unidadNegocioIds = useMemo<number[]>(() => {
    if (!servicios?.length) return [];
    const unidades =
      (catalogsResolved?.unidadesNegocio as Array<{ value: string; id?: number }> | undefined) ?? [];
    const byValue = new Map<string, number>();
    for (const u of unidades) {
      if (typeof u.id === "number") byValue.set(u.value, u.id);
    }
    const ids = new Set<number>();
    for (const s of servicios) {
      if (!s.unidadNegocio) continue;
      const id = byValue.get(s.unidadNegocio);
      if (typeof id === "number") ids.add(id);
    }
    return Array.from(ids);
  }, [servicios, catalogsResolved]);

  const query = trpc.clausulas.getByUnidades.useQuery(
    { unidadNegocioIds },
    { enabled: unidadNegocioIds.length > 0 },
  );

  const clausulas = useMemo<ClausulaVigente[]>(() => {
    if (!query.data) return [];
    const seen = new Set<number>();
    const out: ClausulaVigente[] = [];
    for (const c of query.data) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(c);
    }
    return out;
  }, [query.data]);

  return {
    clausulas,
    /** True mientras la query está corriendo. False si está deshabilitada (sin ids). */
    isLoading: unidadNegocioIds.length > 0 && (query.isLoading || query.isFetching),
    /** True si hay al menos una unidad de negocio en los servicios. */
    hasUnidades: unidadNegocioIds.length > 0,
  };
}
