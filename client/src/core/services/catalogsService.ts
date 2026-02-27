/**
 * catalogsService.ts — Servicio de catálogos para comboboxes via API REST
 *
 * Endpoints consumidos:
 *   GET /catalogs/all              → todos los catálogos en una sola llamada (recomendado)
 *   GET /catalogs/monedas
 *   GET /catalogs/paises
 *   GET /catalogs/unidades-negocio
 *   GET /catalogs/soluciones
 *   GET /catalogs/tipos-venta
 *   GET /catalogs/plazos
 *   GET /catalogs/cecos
 *   GET /catalogs/detalle-servicio
 *   GET /catalogs/documentos-identidad
 *
 * Si la API no está configurada, usa los catálogos estáticos locales.
 *
 * TODO: Conectar con API de Base de Datos aquí — cuando el backend esté listo,
 *       los catálogos se cargarán dinámicamente desde la base de datos.
 */

import { api, isApiConfigured } from "./apiService";
import {
  MONEDAS,
  PAISES,
  UNIDADES_NEGOCIO,
  SOLUCIONES,
  TIPO_VENTA,
  PLAZOS,
  CECOS,
  DETALLE_SERVICIO,
  DOCUMENTO_IDENTIDAD,
} from "@/../../shared/catalogs";

// ── Tipos ─────────────────────────────────────────────────────────────────────
export interface CatalogItem {
  value: string;
  label: string;
  codigo?: string;
  empresa?: string;
  departamento?: string;
  area?: string;
}

export interface AllCatalogs {
  monedas: CatalogItem[];
  paises: CatalogItem[];
  unidadesNegocio: CatalogItem[];
  soluciones: CatalogItem[];
  tiposVenta: CatalogItem[];
  plazos: CatalogItem[];
  cecos: CatalogItem[];
  detalleServicio: CatalogItem[];
  documentosIdentidad: CatalogItem[];
}

// ── Cache en memoria (evita llamadas repetidas en la misma sesión) ─────────────
let _cachedCatalogs: AllCatalogs | null = null;

// ── Fallback local ────────────────────────────────────────────────────────────
function buildLocalCatalogs(): AllCatalogs {
  return {
    monedas: MONEDAS.map((m) => ({ value: m.value, label: m.label })),
    paises: PAISES.map((p) => ({ value: p.value, label: p.label })),
    unidadesNegocio: UNIDADES_NEGOCIO.map((u) => ({ value: u.value, label: u.label })),
    soluciones: SOLUCIONES.map((s) => ({ value: s.value, label: s.label })),
    tiposVenta: TIPO_VENTA.map((t) => ({ value: t.value, label: t.label })),
    plazos: PLAZOS.map((p) => ({ value: p.value, label: p.label })),
    cecos: CECOS.map((c) => ({
      value: c.value,
      label: c.label,
      empresa: c.empresa,
      departamento: c.departamento,
      area: c.area,
    })),
    detalleServicio: DETALLE_SERVICIO.map((d) => ({ value: d.value, label: d.label })),
    documentosIdentidad: DOCUMENTO_IDENTIDAD.map((d) => ({ value: d.value, label: d.label })),
  };
}

// ── Servicio ──────────────────────────────────────────────────────────────────
export const catalogsService = {
  /**
   * Carga todos los catálogos necesarios para los comboboxes.
   * Usa caché en memoria para no repetir llamadas en la misma sesión.
   *
   * TODO: Conectar con API de Base de Datos aquí.
   */
  async getAll(): Promise<AllCatalogs> {
    if (_cachedCatalogs) return _cachedCatalogs;

    if (isApiConfigured()) {
      try {
        const result = await api.get<AllCatalogs>("/catalogs/all");
        _cachedCatalogs = result;
        return result;
      } catch {
        console.warn("[catalogsService] API no disponible, usando catálogos locales");
      }
    }

    _cachedCatalogs = buildLocalCatalogs();
    return _cachedCatalogs;
  },

  /** Invalida el caché (útil cuando el admin actualiza catálogos) */
  invalidateCache(): void {
    _cachedCatalogs = null;
  },
};
