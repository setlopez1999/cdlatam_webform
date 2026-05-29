/**
 * dataSource-clausulas.ts
 * Capa de abstracción para cláusulas legales (PDFs).
 * Actualmente usa SQLite local, preparado para USE_API en el futuro.
 */
import {
  getClausulas,
  getClausulaById,
  getClausulasByUnidadNegocio,
  getClausulasByUnidades,
  createClausula,
  updateClausula,
  deleteClausula,
  toggleClausulaStatus,
  toggleSiempreIncluir,
  getClausulasSiempreIncluir,
  getUnidadesNegocioForSelect,
} from "./db-clausulas";

// Exportar funciones envueltas (pattern dataSource)
export const ds_getClausulas = getClausulas;
export const ds_getClausulaById = getClausulaById;
export const ds_getClausulasByUnidadNegocio = getClausulasByUnidadNegocio;
export const ds_getClausulasByUnidades = getClausulasByUnidades;
export const ds_createClausula = createClausula;
export const ds_updateClausula = updateClausula;
export const ds_deleteClausula = deleteClausula;
export const ds_toggleClausulaStatus = toggleClausulaStatus;
export const ds_toggleSiempreIncluir = toggleSiempreIncluir;
export const ds_getClausulasSiempreIncluir = getClausulasSiempreIncluir;
export const ds_getUnidadesNegocioForSelect = getUnidadesNegocioForSelect;
