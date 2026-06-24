import { describe, it, expect } from "vitest";
import {
  getFormaPagoImplementacion,
  getNCuotasImplementacion,
  getIngresoPorCuota,
  getMesValue,
  sumResumenMeses,
  mesesActivos,
  sanitizeF2Cuotas,
} from "./f1ImplementacionCuotas";
import type { F1Data, ResumenMeses } from "../types";
import { F1_INITIAL, F2_INITIAL } from "../types";

function f1WithImpl(overrides?: Partial<F1Data>): F1Data {
  return {
    ...F1_INITIAL,
    formasPagoImplementacion: [
      {
        id: "fp1",
        item: 1,
        linkedServicioId: "s1",
        tipoVenta: "Implementación",
        nCuotas: 3,
        cuotas: [
          { monto: 1000, fecha: "2026-01-01" },
          { monto: 2000, fecha: "2026-02-01" },
          { monto: 3000, fecha: "2026-03-01" },
        ],
      },
    ],
    serviciosContratados: [{ id: "s1", tipoVenta: "Implementación", unidadNegocio: "", solucion: "", detalleServicio: "", moneda: "", cantidad: 1, precioUnitario: 6000, plazo: "", total: 6000 }],
    ...overrides,
  };
}

describe("getFormaPagoImplementacion", () => {
  it("retorna null si no hay F1", () => {
    expect(getFormaPagoImplementacion(null)).toBeNull();
    expect(getFormaPagoImplementacion(undefined)).toBeNull();
  });

  it("retorna la forma de pago enlazada a un servicio", () => {
    const f1 = f1WithImpl();
    const fp = getFormaPagoImplementacion(f1);
    expect(fp).not.toBeNull();
    expect(fp!.linkedServicioId).toBe("s1");
  });
});

describe("getNCuotasImplementacion", () => {
  it("retorna nCuotas desde F1 (3)", () => {
    expect(getNCuotasImplementacion(f1WithImpl())).toBe(3);
  });

  it("fallback a 3 si nCuotas es menor a 1", () => {
    const f1 = f1WithImpl();
    f1.formasPagoImplementacion[0].nCuotas = 0;
    expect(getNCuotasImplementacion(f1)).toBe(3);
  });

  it("clampa a 4 como máximo", () => {
    const f1 = f1WithImpl();
    f1.formasPagoImplementacion[0].nCuotas = 5;
    expect(getNCuotasImplementacion(f1)).toBe(4);
  });

  it("fallback a 3 si no hay F1", () => {
    expect(getNCuotasImplementacion(null)).toBe(3);
  });
});

describe("getIngresoPorCuota", () => {
  it("retorna montos según nCuotas activas", () => {
    const r = getIngresoPorCuota(f1WithImpl());
    expect(r.mes1).toBe(1000);
    expect(r.mes2).toBe(2000);
    expect(r.mes3).toBe(3000);
    expect(r.mes4).toBe(0);
  });

  it("retorna ceros si no hay F1", () => {
    const r = getIngresoPorCuota(null);
    expect(r.mes1).toBe(0);
    expect(r.mes2).toBe(0);
    expect(r.mes3).toBe(0);
    expect(r.mes4).toBe(0);
  });
});

describe("getMesValue", () => {
  it("retorna valor del mes indicado", () => {
    const resumen: ResumenMeses = { mes1: 10, mes2: 20, mes3: 30, mes4: 40 };
    expect(getMesValue(resumen, 1)).toBe(10);
    expect(getMesValue(resumen, 4)).toBe(40);
  });

  it("retorna 0 para mes fuera de rango", () => {
    const resumen: ResumenMeses = { mes1: 10, mes2: 20, mes3: 30, mes4: 40 };
    expect(getMesValue(resumen, 5 as 1)).toBe(0);
  });
});

describe("sumResumenMeses", () => {
  it("suma primeros N meses", () => {
    const r: ResumenMeses = { mes1: 100, mes2: 200, mes3: 300, mes4: 400 };
    expect(sumResumenMeses(r, 2)).toBe(300);
    expect(sumResumenMeses(r, 3)).toBe(600);
    expect(sumResumenMeses(r, 4)).toBe(1000);
  });

  it("clampa nCuotas a 1–4", () => {
    const r: ResumenMeses = { mes1: 50, mes2: 100, mes3: 150, mes4: 200 };
    expect(sumResumenMeses(r, 0)).toBe(50);
    expect(sumResumenMeses(r, 5)).toBe(500);
  });
});

describe("mesesActivos", () => {
  it("retorna [1] para 1 cuota", () => {
    expect(mesesActivos(1)).toEqual([1]);
  });

  it("retorna [1,2,3,4] para 4 cuotas", () => {
    expect(mesesActivos(4)).toEqual([1, 2, 3, 4]);
  });

  it("clampa a 1–4", () => {
    expect(mesesActivos(0)).toEqual([1]);
    expect(mesesActivos(5)).toEqual([1, 2, 3, 4]);
  });
});

describe("sanitizeF2Cuotas", () => {
  it("elimina filas con cuota/mes mayor a nCuotas de F1", () => {
    const f2 = {
      ...F2_INITIAL,
      hardware: [{ id: "h1", cuota: 1, total: 100 }, { id: "h2", cuota: 4, total: 200 }] as any,
      rrhh: [{ id: "r1", cuota: 2, total: 300 }, { id: "r2", cuota: 5, total: 400 }] as any,
      otrosGastos: [{ id: "o1", mes: 1, total: 500 }, { id: "o2", mes: 3, total: 600 }] as any,
    };
    const f1 = f1WithImpl();
    f1.formasPagoImplementacion[0].nCuotas = 2;
    const sanitized = sanitizeF2Cuotas(f2, f1);
    expect(sanitized.hardware).toHaveLength(1);
    expect(sanitized.hardware[0].id).toBe("h1");
    expect(sanitized.rrhh).toHaveLength(1);
    expect(sanitized.rrhh[0].id).toBe("r1");
    expect(sanitized.otrosGastos).toHaveLength(1);
    expect(sanitized.otrosGastos[0].id).toBe("o1");
  });

  it("no elimina filas sin cuota (undefined)", () => {
    const f2 = {
      ...F2_INITIAL,
      hardware: [{ id: "h1", total: 100 }] as any,
    };
    const sanitized = sanitizeF2Cuotas(f2, null);
    expect(sanitized.hardware).toHaveLength(1);
  });
});
