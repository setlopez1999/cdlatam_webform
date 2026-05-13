/**
 * Tipos y merge del checklist «Implementación» IPTV-OTT.
 * El catálogo maestro vive en BD (`catalog_implementacion_items`); el merge une filas activas con estado por expediente.
 */

export interface ImplementacionRowLike {
  checkKey: string;
  estado: number;
}

export interface ImplementacionItemVM {
  key: string;
  orden: number;
  label: string;
  estado: boolean;
}

/** Une catálogo (solo ítems a mostrar) con filas guardadas; sin fila ⇒ estado false. */
export function mergeImplementacionFromCatalog(
  catalog: readonly { key: string; orden: number; label: string }[],
  rows: ImplementacionRowLike[],
): ImplementacionItemVM[] {
  const map = new Map(rows.map(r => [r.checkKey, r.estado === 1]));
  return catalog.map(item => ({
    key: item.key,
    orden: item.orden,
    label: item.label,
    estado: map.get(item.key) ?? false,
  }));
}
