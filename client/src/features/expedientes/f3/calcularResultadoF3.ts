/**
 * Motor de cálculo F3 — ingreso por cuotas F1, gastos por cuota/mes en F2.
 */
import {
  getIngresoPorCuota,
  getNCuotasImplementacion,
  getMesValue,
  type MesCuota,
} from "../f1/f1ImplementacionCuotas";
import {
  normalizeFilasCosto,
  normalizeFilasRRHH,
  sumOtrosPorMes,
  sumTotalesPorCuota,
} from "../f2/f2RowDerivation";
import type { F1Data, F2Data, F3Calculado, ResumenMeses } from "../types";

export const FRACCION_GIM_DEFAULT = 0.1;
export const TASA_IMPUESTO_DEFAULT = 0.19;
const IMPUESTO_FRACCION_MIN = 0.005;
const IMPUESTO_FRACCION_MAX = 1;

export interface CalcularResultadoF3Opciones {
  fraccionGIM?: number;
  tasaImpuesto?: number;
}

function buildGastosPorCuota(
  f2: F2Data,
): { hardware: ResumenMeses; materiales: ResumenMeses; rh: ResumenMeses; otros: ResumenMeses } {
  const hw = normalizeFilasCosto(f2.hardware ?? []);
  const mat = normalizeFilasCosto(f2.materiales ?? []);
  const rh = normalizeFilasRRHH(f2.rrhh ?? []);
  const otros = f2.otrosGastos ?? [];
  const mes = (n: MesCuota) => ({
    hw: sumTotalesPorCuota(hw, n),
    mat: sumTotalesPorCuota(mat, n),
    rh: sumTotalesPorCuota(rh, n),
    ot: sumOtrosPorMes(otros, n),
  });
  const m1 = mes(1), m2 = mes(2), m3 = mes(3), m4 = mes(4);
  return {
    hardware:   { mes1: m1.hw, mes2: m2.hw, mes3: m3.hw, mes4: m4.hw },
    materiales: { mes1: m1.mat, mes2: m2.mat, mes3: m3.mat, mes4: m4.mat },
    rh:         { mes1: m1.rh, mes2: m2.rh, mes3: m3.rh, mes4: m4.rh },
    otros:      { mes1: m1.ot, mes2: m2.ot, mes3: m3.ot, mes4: m4.ot },
  };
}

function sumCategoriasGasto(
  cat: { hardware: ResumenMeses; materiales: ResumenMeses; rh: ResumenMeses; otros: ResumenMeses },
  mes: MesCuota,
): number {
  return (
    getMesValue(cat.hardware, mes)
    + getMesValue(cat.materiales, mes)
    + getMesValue(cat.rh, mes)
    + getMesValue(cat.otros, mes)
  );
}

function buildResumenFromMeses(
  meses: MesCuota[],
  fn: (mes: MesCuota) => number,
): ResumenMeses {
  const out: ResumenMeses = { mes1: 0, mes2: 0, mes3: 0, mes4: 0 };
  for (const mes of meses) {
    out[`mes${mes}`] = fn(mes);
  }
  return out;
}

export function calcularResultadoF3(
  f2: F2Data,
  f1?: F1Data,
  opciones?: CalcularResultadoF3Opciones,
): F3Calculado {
  let g = opciones?.fraccionGIM ?? FRACCION_GIM_DEFAULT;
  if (!Number.isFinite(g)) g = FRACCION_GIM_DEFAULT;
  g = Math.min(1, Math.max(0, g));
  const p = 1 - g;

  const nCuotas = getNCuotasImplementacion(f1);
  const meses: MesCuota[] = Array.from({ length: nCuotas }, (_, i) => (i + 1) as MesCuota);

  let ingreso = getIngresoPorCuota(f1);
  if (!f1 && (f2.montoProyecto ?? 0) > 0) {
    const porMes = f2.montoProyecto / nCuotas;
    ingreso = buildResumenFromMeses(meses, () => porMes);
  }

  const categorias = buildGastosPorCuota(f2);
  const gastos = buildResumenFromMeses(meses, mes => sumCategoriasGasto(categorias, mes));
  const resultado = buildResumenFromMeses(
    meses,
    mes => getMesValue(ingreso, mes) - getMesValue(gastos, mes),
  );

  const distribucionGim = buildResumenFromMeses(meses, mes => getMesValue(resultado, mes) * g);
  const distribucionGp = buildResumenFromMeses(meses, mes => getMesValue(resultado, mes) * p);

  let tImp = opciones?.tasaImpuesto ?? TASA_IMPUESTO_DEFAULT;
  if (!Number.isFinite(tImp)) tImp = TASA_IMPUESTO_DEFAULT;
  tImp = Math.min(IMPUESTO_FRACCION_MAX, Math.max(IMPUESTO_FRACCION_MIN, tImp));

  const factBruto = distribucionGp;
  const factImpuesto = buildResumenFromMeses(meses, mes => getMesValue(factBruto, mes) * tImp);
  const factNeto = buildResumenFromMeses(
    meses,
    mes => getMesValue(factBruto, mes) * (1 - tImp),
  );

  return {
    resumen: {
      hardware: categorias.hardware,
      materiales: categorias.materiales,
      rh: categorias.rh,
      otros: categorias.otros,
      totalGastos: gastos,
    },
    nCuotas,
    ingreso,
    gastos,
    resultado,
    distribucion: {
      gim: { porcentaje: g, ...distribucionGim },
      gp: { porcentaje: p, ...distribucionGp },
    },
    facturacion: {
      bruto: factBruto,
      impuesto: { tasa: tImp, ...factImpuesto },
      neto: factNeto,
    },
  };
}
