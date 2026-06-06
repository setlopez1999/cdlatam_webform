/**
 * Lectura de cuotas de Implementación desde F1 (forma de pago enlazada a servicio).
 * Compartido por F2 (nCuotas en tablas) y F3 (ingreso por mes).
 */
import type { F1Data, F2Data, FormaPago, ResumenMeses } from "../types";

export type MesCuota = 1 | 2 | 3 | 4;

/** Forma de pago de implementación enlazada a un servicio (misma regla que F2Form). */
export function getFormaPagoImplementacion(f1?: F1Data | null): FormaPago | null {
  if (!f1) return null;
  return f1.formasPagoImplementacion?.find(fp => fp.linkedServicioId) ?? null;
}

/** Número de cuotas activas (1–4) desde F1 implementación; fallback 3 sin F1. */
export function getNCuotasImplementacion(f1?: F1Data | null): number {
  const impl = getFormaPagoImplementacion(f1);
  if (impl && impl.nCuotas >= 1) return Math.min(4, Math.max(1, impl.nCuotas));
  return 3;
}

const EMPTY_MESES: ResumenMeses = { mes1: 0, mes2: 0, mes3: 0, mes4: 0 };

/** Montos de ingreso por mes: usa cuotas[i].monto tal cual (sin validar suma vs servicio). */
export function getIngresoPorCuota(f1?: F1Data | null): ResumenMeses {
  const n = getNCuotasImplementacion(f1);
  const impl = getFormaPagoImplementacion(f1);
  const out = { ...EMPTY_MESES };
  for (let i = 0; i < n; i++) {
    const key = `mes${i + 1}` as keyof ResumenMeses;
    out[key] = Number(impl?.cuotas?.[i]?.monto) || 0;
  }
  return out;
}

export function getMesValue(resumen: ResumenMeses, mes: MesCuota): number {
  return resumen[`mes${mes}`] ?? 0;
}

/** Suma mes1..mesN según nCuotas activas. */
export function sumResumenMeses(resumen: ResumenMeses, nCuotas: number): number {
  let total = 0;
  for (let i = 1; i <= Math.min(4, Math.max(1, nCuotas)); i++) {
    total += getMesValue(resumen, i as MesCuota);
  }
  return total;
}

/** Índices de mes activos [1..nCuotas]. */
export function mesesActivos(nCuotas: number): MesCuota[] {
  const n = Math.min(4, Math.max(1, nCuotas));
  return Array.from({ length: n }, (_, i) => (i + 1) as MesCuota);
}

/** Elimina filas F2 con cuota/mes mayor al nCuotas de F1 implementación. */
export function sanitizeF2Cuotas(data: F2Data, f1?: F1Data | null): F2Data {
  const n = getNCuotasImplementacion(f1);
  const keepCuota = (c?: number) => c == null || c <= n;
  const keepMes = (m: number) => m <= n;
  return {
    ...data,
    hardware: data.hardware.filter(r => keepCuota(r.cuota)),
    materiales: data.materiales.filter(r => keepCuota(r.cuota)),
    rrhh: data.rrhh.filter(r => keepCuota(r.cuota)),
    otrosGastos: data.otrosGastos.filter(r => keepMes(r.mes)),
  };
}
