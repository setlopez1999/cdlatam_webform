import { describe, it, expect } from "vitest";
import { calcularResultadoF3 } from "./calcularResultadoF3";
import { getMesValue } from "../f1/f1ImplementacionCuotas";
import type { F1Data, F2Data, FilaCosto, FilaOtros, FilaRRHH } from "../types";
import { F1_INITIAL, F2_INITIAL } from "../types";

function mkCosto(total: number, cuota?: 1 | 2 | 3 | 4): FilaCosto {
  return {
    id: "hw",
    centroCosto: "",
    descripcionGasto: "",
    valorNeto: total,
    cantidad: 1,
    totalNeto: total,
    iva: 0,
    total,
    tipoMoneda: "USD",
    observacion: "",
    cuota,
  };
}

function mkRRHH(total: number, cuota?: 1 | 2 | 3 | 4): FilaRRHH {
  return {
    id: "rh",
    tipo: "tecnico_interno",
    label: "",
    centroCosto: "",
    valorSinImpuesto: total,
    tipoMoneda: "USD",
    cantidad: 1,
    totalNeto: total,
    impuesto: 0,
    total,
    descripcionGasto: "",
    observacion: "",
    cuota,
  };
}

function mkOtros(total: number, mes: 1 | 2 | 3 | 4): FilaOtros {
  return {
    id: "ot",
    tipo: "varios",
    label: "",
    centroCosto: "",
    valorNeto: total,
    cantidad: 1,
    totalNeto: total,
    iva: 0,
    total,
    tipoMoneda: "USD",
    descripcionGasto: "",
    observacion: "",
    mes,
  };
}

/** Caso ilustrativo del plan (Expediente #14, 3 cuotas). */
function buildExp14Fixture(): { f1: F1Data; f2: F2Data } {
  const servicioId = "svc-impl-14";
  const f1: F1Data = {
    ...F1_INITIAL,
    formasPagoImplementacion: [
      {
        id: "fp-impl",
        item: 1,
        tipoVenta: "Implementación",
        nCuotas: 3,
        linkedServicioId: servicioId,
        cuotas: [
          { monto: 15000, fecha: "" },
          { monto: 12000, fecha: "" },
          { monto: 18000, fecha: "" },
        ],
      },
    ],
    serviciosContratados: [
      {
        id: servicioId,
        tipoVenta: "Implementación",
        unidadNegocio: "",
        solucion: "",
        detalleServicio: "",
        moneda: "USD",
        cantidad: 1,
        precioUnitario: 45000,
        plazo: "",
        total: 45000,
      },
    ],
  };
  const f2: F2Data = {
    ...F2_INITIAL,
    hardware: [mkCosto(8000, 1), mkCosto(1000, 2)],
    materiales: [mkCosto(2000, 1), mkCosto(500, 2)],
    rrhh: [mkRRHH(3000, 1), mkRRHH(4000, 2), mkRRHH(2000, 3)],
    otrosGastos: [mkOtros(500, 1), mkOtros(300, 2), mkOtros(200, 3)],
  };
  return { f1, f2 };
}

describe("calcularResultadoF3 — gastos por cuota e ingreso desde F1", () => {
  it("Expediente #14 (3 cuotas): imputa HW/Mat/RRHH por cuota y otros por mes", () => {
    const { f1, f2 } = buildExp14Fixture();
    const r = calcularResultadoF3(f2, f1);

    expect(r.nCuotas).toBe(3);
    expect(r.ingreso.mes1).toBe(15000);
    expect(r.ingreso.mes2).toBe(12000);
    expect(r.ingreso.mes3).toBe(18000);

    expect(r.gastos.mes1).toBe(13500);
    expect(r.gastos.mes2).toBe(5800);
    expect(r.gastos.mes3).toBe(2200);

    expect(r.resultado.mes1).toBe(1500);
    expect(r.resultado.mes2).toBe(6200);
    expect(r.resultado.mes3).toBe(15800);

    expect(r.resumen.rh.mes2).toBe(4000);
    expect(r.resumen.hardware.mes2).toBe(1000);
  });

  it("sin F1: reparte ingreso desde montoProyecto / nCuotas (fallback 3)", () => {
    const f2: F2Data = {
      ...F2_INITIAL,
      montoProyecto: 30000,
      hardware: [mkCosto(5000)],
      materiales: [mkCosto(2000)],
      rrhh: [mkRRHH(1000)],
      otrosGastos: [mkOtros(500, 1)],
    };
    const r = calcularResultadoF3(f2);
    expect(r.ingreso.mes1).toBe(10000);
    expect(r.gastos.mes1).toBe(8500);
    expect(r.resultado.mes1).toBe(1500);
  });

  it("otros gastos se imputan solo al mes indicado", () => {
    const f2: F2Data = {
      ...F2_INITIAL,
      montoProyecto: 30000,
      otrosGastos: [mkOtros(1000, 1), mkOtros(2000, 2), mkOtros(3000, 3)],
    };
    const r = calcularResultadoF3(f2);
    expect(r.gastos.mes1).toBe(1000);
    expect(r.gastos.mes2).toBe(2000);
    expect(r.gastos.mes3).toBe(3000);
  });

  it("distribución GIM/GP y facturación se aplican por mes", () => {
    const { f1, f2 } = buildExp14Fixture();
    const r = calcularResultadoF3(f2, f1);
    const mes2 = 2 as const;
    expect(getMesValue(r.distribucion.gim, mes2)).toBeCloseTo(r.resultado.mes2 * 0.1, 2);
    expect(getMesValue(r.distribucion.gp, mes2)).toBeCloseTo(r.resultado.mes2 * 0.9, 2);
    expect(getMesValue(r.facturacion.neto, mes2)).toBeCloseTo(
      getMesValue(r.facturacion.bruto, mes2) * (1 - 0.19),
      2,
    );
  });

  it("suma varias filas HW en la misma cuota para gastos del mes", () => {
    const f2: F2Data = {
      ...F2_INITIAL,
      hardware: [mkCosto(1000, 2), mkCosto(500, 2)],
      materiales: [],
      rrhh: [],
      otrosGastos: [],
    };
    const f1: F1Data = {
      ...F1_INITIAL,
      formasPagoImplementacion: [{
        id: "fp2",
        item: 1,
        tipoVenta: "Implementación",
        nCuotas: 2,
        linkedServicioId: "s2",
        cuotas: [{ monto: 5000, fecha: "" }, { monto: 8000, fecha: "" }],
      }],
      serviciosContratados: [{
        id: "s2",
        tipoVenta: "Implementación",
        unidadNegocio: "",
        solucion: "",
        detalleServicio: "",
        moneda: "USD",
        cantidad: 1,
        precioUnitario: 13000,
        plazo: "",
        total: 13000,
      }],
    };
    const r = calcularResultadoF3(f2, f1);
    expect(r.gastos.mes2).toBe(1500);
    expect(r.resumen.hardware.mes2).toBe(1500);
  });

  it("soporta 4 cuotas cuando F1 define nCuotas=4", () => {
    const f1: F1Data = {
      ...F1_INITIAL,
      formasPagoImplementacion: [
        {
          id: "fp4",
          item: 1,
          tipoVenta: "Implementación",
          nCuotas: 4,
          linkedServicioId: "s1",
          cuotas: [
            { monto: 1000, fecha: "" },
            { monto: 2000, fecha: "" },
            { monto: 3000, fecha: "" },
            { monto: 4000, fecha: "" },
          ],
        },
      ],
      serviciosContratados: [{
        id: "s1",
        tipoVenta: "Implementación",
        unidadNegocio: "",
        solucion: "",
        detalleServicio: "",
        moneda: "USD",
        cantidad: 1,
        precioUnitario: 10000,
        plazo: "",
        total: 10000,
      }],
    };
    const f2: F2Data = { ...F2_INITIAL, hardware: [mkCosto(100, 4)] };
    const r = calcularResultadoF3(f2, f1);
    expect(r.nCuotas).toBe(4);
    expect(r.ingreso.mes4).toBe(4000);
    expect(r.gastos.mes4).toBe(100);
    expect(r.resultado.mes4).toBe(3900);
  });
});
