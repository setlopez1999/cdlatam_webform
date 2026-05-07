import { describe, it, expect } from "vitest";
import { reconcileFormasPagoDesdeServicios } from "./reconcileFormasPago";
import type { F1Data, FormaPago, ServicioContratado } from "../types";
import { F1_INITIAL } from "../types";

function svc(partial: Partial<ServicioContratado> & Pick<ServicioContratado, "id">): ServicioContratado {
  return {
    unidadNegocio: "",
    solucion: "",
    detalleServicio: "",
    tipoVenta: "",
    moneda: "",
    cantidad: 1,
    precioUnitario: 0,
    plazo: "",
    total: 0,
    ...partial,
  };
}

const empty4 = (): FormaPago["cuotas"] => [
  { monto: 0, fecha: "" },
  { monto: 0, fecha: "" },
  { monto: 0, fecha: "" },
  { monto: 0, fecha: "" },
];

describe("reconcileFormasPagoDesdeServicios", () => {
  it("semilla monto y nCuotas solo al crear la fila enlazada", () => {
    const base: F1Data = {
      ...F1_INITIAL,
      serviciosContratados: [
        svc({
          id: "s1",
          tipoVenta: "implementacion",
          cantidad: 2,
          precioUnitario: 100,
          total: 200,
        }),
      ],
    };
    const r = reconcileFormasPagoDesdeServicios(base);
    expect(r.formasPagoImplementacion).toHaveLength(1);
    expect(r.formasPagoImplementacion[0].linkedServicioId).toBe("s1");
    expect(r.formasPagoImplementacion[0].nCuotas).toBe(1);
    expect(r.formasPagoImplementacion[0].cuotas[0].monto).toBe(200);
  });

  it("no pisa monto ni nCuotas si la fila enlazada ya existe", () => {
    const fp: FormaPago = {
      id: "fp1",
      item: 1,
      linkedServicioId: "s1",
      tipoVenta: "implementacion",
      nCuotas: 3,
      cuotas: (() => {
        const c = empty4();
        c[0] = { monto: 777, fecha: "2026-01-01" };
        c[1] = { monto: 100, fecha: "" };
        return c;
      })(),
    };
    const base: F1Data = {
      ...F1_INITIAL,
      serviciosContratados: [
        svc({
          id: "s1",
          tipoVenta: "implementacion",
          total: 9999,
        }),
      ],
      formasPagoImplementacion: [fp],
    };
    const r = reconcileFormasPagoDesdeServicios(base);
    const row = r.formasPagoImplementacion.find(p => p.id === "fp1");
    expect(row?.cuotas[0].monto).toBe(777);
    expect(row?.nCuotas).toBe(3);
    expect(row?.cuotas[0].fecha).toBe("2026-01-01");
  });

  it("encuentra fila existente al mover Impl → Mant y preserva datos", () => {
    const fp: FormaPago = {
      id: "fp1",
      item: 1,
      linkedServicioId: "s1",
      tipoVenta: "mantencion",
      nCuotas: 2,
      cuotas: (() => {
        const c = empty4();
        c[0] = { monto: 50, fecha: "" };
        return c;
      })(),
    };
    const base: F1Data = {
      ...F1_INITIAL,
      serviciosContratados: [
        svc({
          id: "s1",
          tipoVenta: "mantencion",
          total: 500,
        }),
      ],
      formasPagoImplementacion: [fp],
      formasPagoMantencion: [],
    };
    const r = reconcileFormasPagoDesdeServicios(base);
    expect(r.formasPagoImplementacion.filter(p => p.linkedServicioId)).toHaveLength(0);
    expect(r.formasPagoMantencion.some(p => p.id === "fp1")).toBe(true);
    const row = r.formasPagoMantencion.find(p => p.id === "fp1");
    expect(row?.cuotas[0].monto).toBe(50);
    expect(row?.nCuotas).toBe(2);
  });
});
