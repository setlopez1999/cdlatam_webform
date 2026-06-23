/**
 * Derivación pura de filas F2 por cuota (Hardware, Materiales, RRHH, Otros).
 * Sin efectos secundarios — usable en render, guardado e hidratación desde BD.
 */
import { nanoid } from "nanoid";
import type { FilaCosto, FilaOtros, FilaRRHH } from "../types";

export type Cuota = 1 | 2 | 3 | 4;

const ITEMS_FIJOS: Array<{ tipo: FilaOtros["tipo"]; label: string }> = [
  { tipo: "comision", label: "Comisión" },
  { tipo: "movilizacion", label: "Movilización" },
  { tipo: "viatico", label: "Viático" },
  { tipo: "movilizacion", label: "Movilización" },
  { tipo: "viatico", label: "Viático" },
  { tipo: "movilizacion", label: "Movilización" },
  { tipo: "alojamiento", label: "Alojamiento" },
  { tipo: "varios", label: "Varios" },
];

export function clampNCuotas(n: number): number {
  return Math.min(4, Math.max(1, n || 1));
}

/** IDs estables para slots derivados vacíos (evita nanoid distinto en cada render/update). */
export function costoPlaceholderId(cuota: Cuota): string {
  return `__f2_costo_c${cuota}`;
}

export function rrhhPlaceholderId(cuota: Cuota): string {
  return `__f2_rrhh_c${cuota}`;
}

export function otrosPlaceholderId(mes: Cuota, index: number): string {
  return `__f2_otros_c${mes}_i${index}`;
}

export function newFilaCosto(cuota: Cuota, id?: string): FilaCosto {
  return {
    id: id ?? nanoid(),
    centroCosto: "",
    descripcionGasto: "",
    valorNeto: 0,
    tipoMoneda: "",
    tipoCambio: null,
    cantidad: 1,
    totalNeto: 0,
    iva: 0,
    total: 0,
    observacion: "",
    cuota,
  };
}

export function newFilaRRHH(cuota: Cuota, id?: string): FilaRRHH {
  return {
    id: id ?? nanoid(),
    tipo: "tecnico_interno",
    label: "",
    centroCosto: "",
    valorSinImpuesto: 0,
    tipoMoneda: "",
    tipoCambio: null,
    cantidad: 1,
    totalNeto: 0,
    impuesto: 0,
    total: 0,
    descripcionGasto: "",
    observacion: "",
    cuota,
  };
}

export function newFilaOtros(
  tipo: FilaOtros["tipo"],
  label: string,
  mes: Cuota,
  moneda = "USD",
  id?: string,
): FilaOtros {
  return {
    id: id ?? nanoid(),
    tipo,
    label,
    descripcionGasto: label,
    centroCosto: "",
    tipoMoneda: moneda,
    tipoCambio: null,
    valorNeto: 0,
    cantidad: 1,
    totalNeto: 0,
    iva: 0,
    total: 0,
    observacion: "",
    mes,
  };
}

/** Filas legacy guardadas sin `cuota`: asigna cuota 1..N por orden en el array. */
export function normalizeFilasCosto(rows: FilaCosto[]): FilaCosto[] {
  let legacyIndex = 0;
  return rows.map(row => {
    if (row.cuota != null) return row;
    legacyIndex += 1;
    return { ...row, cuota: Math.min(4, legacyIndex) as Cuota };
  });
}

/** Filas legacy RRHH sin `cuota`: asigna cuota 1..N por orden. */
export function normalizeFilasRRHH(rows: FilaRRHH[]): FilaRRHH[] {
  let legacyIndex = 0;
  return rows.map(row => {
    if (row.cuota != null) return row;
    legacyIndex += 1;
    return { ...row, cuota: Math.min(4, legacyIndex) as Cuota };
  });
}

/** Suma `total` de filas imputadas a una cuota/mes. */
export function sumTotalesPorCuota<T extends { total: number; cuota?: number }>(
  rows: T[],
  cuota: Cuota,
): number {
  return rows.reduce((s, r) => s + (r.cuota === cuota ? r.total : 0), 0);
}

export function sumOtrosPorMes(rows: FilaOtros[], mes: Cuota): number {
  return rows.reduce((s, r) => s + (r.mes === mes ? r.total : 0), 0);
}

/** Todas las filas del store agrupadas por cuota 1..n (varias filas por cuota). */
function deriveFilasPorCuota<T extends { cuota?: number }>(
  stored: T[],
  n: number,
  normalize: (rows: T[]) => T[],
): T[] {
  const count = clampNCuotas(n);
  const normalized = normalize(stored);
  const result: T[] = [];
  for (let i = 1; i <= count; i++) {
    const cuota = i as Cuota;
    result.push(...normalized.filter(r => r.cuota === cuota));
  }
  return result;
}

export function deriveFilasCosto(stored: FilaCosto[], n: number): FilaCosto[] {
  return deriveFilasPorCuota(stored, n, normalizeFilasCosto);
}

export function deriveFilasRRHH(stored: FilaRRHH[], n: number): FilaRRHH[] {
  return deriveFilasPorCuota(stored, n, normalizeFilasRRHH);
}

export function appendCostoAtCuota(stored: FilaCosto[], cuota: Cuota): FilaCosto[] {
  return [...stored, newFilaCosto(cuota)];
}

export function appendRRHHAtCuota(stored: FilaRRHH[], cuota: Cuota): FilaRRHH[] {
  return [...stored, newFilaRRHH(cuota)];
}

export function removeRowById<T extends { id: string }>(stored: T[], id: string): T[] {
  return stored.filter(r => r.id !== id);
}

export function deriveFilasOtros(stored: FilaOtros[], n: number, moneda: string): FilaOtros[] {
  const count = clampNCuotas(n);
  const result: FilaOtros[] = [];
  for (let i = 1; i <= count; i++) {
    const mes = i as Cuota;
    const existentes = stored.filter(o => o.mes === mes);
    if (existentes.length > 0) {
      result.push(...existentes);
    } else {
      result.push(...ITEMS_FIJOS.map((item, idx) =>
        newFilaOtros(item.tipo, item.label, mes, moneda, otrosPlaceholderId(mes, idx)),
      ));
    }
  }
  return result;
}

function applyTipoCambio(totalNeto: number, row: { tipoCambio?: number }): number {
  return totalNeto * (row.tipoCambio || 1);
}

export function recalcFilaCosto(row: FilaCosto, field: keyof FilaCosto, value: string | number): FilaCosto {
  const u = { ...row, [field]: value };
  if (field === "valorNeto" || field === "cantidad" || field === "tipoCambio") {
    u.totalNeto = applyTipoCambio(u.valorNeto * u.cantidad, u);
    u.total = u.totalNeto + u.iva;
  }
  if (field === "iva") u.total = u.totalNeto + u.iva;
  return u;
}

export function recalcFilaRRHH(row: FilaRRHH, field: keyof FilaRRHH, value: string | number): FilaRRHH {
  const u = { ...row, [field]: value };
  if (field === "valorSinImpuesto" || field === "cantidad" || field === "tipoCambio") {
    u.totalNeto = applyTipoCambio(u.valorSinImpuesto * u.cantidad, u);
    u.total = u.totalNeto + u.impuesto;
  }
  if (field === "impuesto") u.total = u.totalNeto + u.impuesto;
  return u;
}

export function recalcFilaOtros(row: FilaOtros, field: keyof FilaOtros, value: string | number): FilaOtros {
  const u = { ...row, [field]: value };
  if (field === "valorNeto" || field === "cantidad" || field === "tipoCambio") {
    u.totalNeto = applyTipoCambio(u.valorNeto * u.cantidad, u);
    u.total = u.totalNeto + u.iva;
  }
  if (field === "iva") u.total = u.totalNeto + u.iva;
  return u;
}

/** Actualiza fila en stored sin re-derivar todo el array (derivación queda en useMemo del render). */
export function updateCostRowInList(
  stored: FilaCosto[],
  nCuotas: number,
  id: string,
  field: keyof FilaCosto,
  value: string | number,
): FilaCosto[] {
  if (stored.some(r => r.id === id)) {
    return stored.map(r => (r.id === id ? recalcFilaCosto(r, field, value) : r));
  }
  const derived = deriveFilasCosto(stored, nCuotas);
  const row = derived.find(r => r.id === id);
  if (!row) return stored;
  return [...stored, recalcFilaCosto(row, field, value)];
}

export function updateRRHHRowInList(
  stored: FilaRRHH[],
  nCuotas: number,
  id: string,
  field: keyof FilaRRHH,
  value: string | number,
): FilaRRHH[] {
  if (stored.some(r => r.id === id)) {
    return stored.map(r => (r.id === id ? recalcFilaRRHH(r, field, value) : r));
  }
  const derived = deriveFilasRRHH(stored, nCuotas);
  const row = derived.find(r => r.id === id);
  if (!row) return stored;
  return [...stored, recalcFilaRRHH(row, field, value)];
}

export function updateOtrosRowInList(
  stored: FilaOtros[],
  nCuotas: number,
  moneda: string,
  id: string,
  field: keyof FilaOtros,
  value: string | number,
): FilaOtros[] {
  if (stored.some(r => r.id === id)) {
    return stored.map(r => (r.id === id ? recalcFilaOtros(r, field, value) : r));
  }
  const derived = deriveFilasOtros(stored, nCuotas, moneda);
  const row = derived.find(r => r.id === id);
  if (!row) return stored;
  return [...stored, recalcFilaOtros(row, field, value)];
}

export { ITEMS_FIJOS };
