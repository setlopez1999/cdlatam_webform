/**
 * Plantillas iniciales de `catalog_consideraciones_comerciales` (Acta F1).
 *
 * Integridad: los mismos valores están en `drizzle/migrations/0010_catalog_consideraciones_comerciales.sql`.
 * Si cambias textos u orden, actualiza ambos o ejecuta una nueva migración y ajusta este array.
 */

export interface ConsideracionComercialSeedRow {
  id: number;
  valor: string;
  orden: number;
}

export const CATALOG_CONSIDERACIONES_COMERCIALES_SEED: readonly ConsideracionComercialSeedRow[] = [
  { id: 1, valor: "Activación nueva.", orden: 1 },
  { id: 2, valor: "Valores expresados en dólares.", orden: 2 },
  {
    id: 3,
    valor: "Valores NO incluyen impuestos ni comisiones bancarias o de transferencia.",
    orden: 3,
  },
  { id: 4, valor: "El servicio no incluye hardware.", orden: 4 },
  {
    id: 5,
    valor: "Se considera un descuento del 50% en las dos primeras cuotas de mantención.",
    orden: 5,
  },
  {
    id: 6,
    valor:
      "La forma de pago de la mantención es mes vencido a partir de la entrega del servicio.",
    orden: 6,
  },
];

function escapeSqlSingleQuotes(val: string): string {
  return val.replace(/'/g, "''");
}

/**
 * INSERT OR IGNORE idempotente para arranque (`ensureAllProjectTables`).
 * Debe generar el mismo resultado que el INSERT de la migración 0010.
 */
export function sqlSeedConsideracionesComerciales(): string {
  const tuples = CATALOG_CONSIDERACIONES_COMERCIALES_SEED.map(
    r => `(${r.id}, '${escapeSqlSingleQuotes(r.valor)}', ${r.orden}, 1)`,
  ).join(",\n");
  return `INSERT OR IGNORE INTO catalog_consideraciones_comerciales (id, valor, orden, activo) VALUES\n${tuples};`;
}
