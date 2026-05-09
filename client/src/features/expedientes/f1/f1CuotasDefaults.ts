import type { CuotaPago } from "../types";

/** Cuatro cuotas vacías — misma forma en reconcile y en filas manuales del F1. */
export function createFourCuotasEmpty(): CuotaPago[] {
  const empty: CuotaPago = { monto: 0, fecha: "" };
  return [{ ...empty }, { ...empty }, { ...empty }, { ...empty }];
}
