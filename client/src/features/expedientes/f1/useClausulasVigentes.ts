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
 *   4. Llama a `clausulas.getSiempreIncluir` para obtener cláusulas globales
 *      (siempre_incluir=1) que se adjuntan sin importar la unidad de negocio.
 *   5. Deduplica los resultados por `clausula.id`.
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

  // Cláusulas por unidad de negocio (condicional)
  const queryByUnidades = trpc.clausulas.getByUnidades.useQuery(
    { unidadNegocioIds },
    { enabled: unidadNegocioIds.length > 0 },
  );

  // Cláusulas globales: siempre_incluir=1 (siempre activa)
  const querySiempre = trpc.clausulas.getSiempreIncluir.useQuery();

  const clausulas = useMemo<ClausulaVigente[]>(() => {
    const seen = new Set<number>();
    const out: ClausulaVigente[] = [];

    // Primero las globales (siempre_incluir=1) — aparecen al inicio de la lista
    for (const c of querySiempre.data ?? []) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push({ ...c, unidadNegocioId: null });
    }

    // Luego las de la unidad de negocio del expediente
    for (const c of queryByUnidades.data ?? []) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(c);
    }

    return out;
  }, [queryByUnidades.data, querySiempre.data]);

  return {
    clausulas,
    /** True mientras alguna query está corriendo. */
    isLoading:
      querySiempre.isLoading ||
      querySiempre.isFetching ||
      (unidadNegocioIds.length > 0 && (queryByUnidades.isLoading || queryByUnidades.isFetching)),
    /** True si hay al menos una unidad de negocio en los servicios. */
    hasUnidades: unidadNegocioIds.length > 0,
  };
}
