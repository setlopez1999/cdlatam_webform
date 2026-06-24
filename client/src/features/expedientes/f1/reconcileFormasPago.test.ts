import { describe, it, expect } from "vitest";
import {
  reconcileFormasPagoDesdeServicios,
  formasReconcilePatchOrNull,
  computeTotalDescuentoMantencion,
  distributeTotalAcrossCuotas,
} from "./reconcileFormasPago";
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

  it("no pisa monto ni nCuotas si el total enlazado no cambió", () => {
    const fp: FormaPago = {
      id: "fp1",
      item: 1,
      linkedServicioId: "s1",
      linkedServicioTotal: 9999,
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

  it("pisa montos automáticamente si cambia el total del servicio enlazado", () => {
    const fp: FormaPago = {
      id: "fp1",
      item: 1,
      linkedServicioId: "s1",
      linkedServicioTotal: 1000,
      tipoVenta: "implementacion",
      nCuotas: 2,
      cuotas: (() => {
        const c = empty4();
        c[0] = { monto: 777, fecha: "2026-01-01" };
        c[1] = { monto: 111, fecha: "2026-02-01" };
        return c;
      })(),
    };
    const base: F1Data = {
      ...F1_INITIAL,
      serviciosContratados: [svc({ id: "s1", tipoVenta: "implementacion", total: 7000 })],
      formasPagoImplementacion: [fp],
    };
    const r = reconcileFormasPagoDesdeServicios(base);
    const row = r.formasPagoImplementacion.find(p => p.id === "fp1");
    expect(row?.linkedServicioTotal).toBe(7000);
    expect(row?.cuotas[0].monto).toBe(3500);
    expect(row?.cuotas[1].monto).toBe(3500);
    expect(row?.cuotas[0].fecha).toBe("2026-01-01");
    expect(row?.cuotas[1].fecha).toBe("2026-02-01");
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

  it("formasReconcilePatchOrNull es null si no hay nada que cambiar", () => {
    const base: F1Data = {
      ...F1_INITIAL,
      serviciosContratados: [
        svc({
          id: "s1",
          tipoVenta: "implementacion",
          total: 100,
        }),
      ],
    };
    const rec = reconcileFormasPagoDesdeServicios(base);
    const aligned: F1Data = { ...base, ...rec };
    expect(formasReconcilePatchOrNull(aligned)).toBeNull();
  });

  it("semilla Mantención con montos en cero y precio unitario enlazado", () => {
    const base: F1Data = {
      ...F1_INITIAL,
      serviciosContratados: [
        svc({
          id: "m1",
          tipoVenta: "mantencion",
          cantidad: 1,
          precioUnitario: 200,
          total: 200,
        }),
      ],
    };
    const r = reconcileFormasPagoDesdeServicios(base);
    expect(r.formasPagoMantencion).toHaveLength(1);
    expect(r.formasPagoMantencion[0].cuotas[0].monto).toBe(0);
    expect(r.formasPagoMantencion[0].linkedServicioPrecioUnitario).toBe(200);
  });

  it("Mantención: resetea montos de gracia si cambia el precio unitario del servicio", () => {
    const fp: FormaPago = {
      id: "fp1",
      item: 1,
      linkedServicioId: "m1",
      linkedServicioTotal: 200,
      linkedServicioPrecioUnitario: 200,
      tipoVenta: "mantencion",
      nCuotas: 2,
      cuotas: (() => {
        const c = empty4();
        c[0] = { monto: 150, fecha: "2026-01-01" };
        c[1] = { monto: 180, fecha: "2026-02-02" };
        return c;
      })(),
    };
    const base: F1Data = {
      ...F1_INITIAL,
      serviciosContratados: [
        svc({
          id: "m1",
          tipoVenta: "mantencion",
          precioUnitario: 250,
          cantidad: 1,
          total: 250,
        }),
      ],
      formasPagoMantencion: [fp],
    };
    const r = reconcileFormasPagoDesdeServicios(base);
    const row = r.formasPagoMantencion[0];
    expect(row.linkedServicioPrecioUnitario).toBe(250);
    expect(row.cuotas[0].monto).toBe(0);
    expect(row.cuotas[1].monto).toBe(0);
    expect(row.cuotas[0].fecha).toBe("2026-01-01");
  });

  it("Mantención: no resetea montos si solo cambia el total manteniendo el mismo precio unitario", () => {
    const fp: FormaPago = {
      id: "fp1",
      item: 1,
      linkedServicioId: "m1",
      linkedServicioTotal: 100,
      linkedServicioPrecioUnitario: 100,
      tipoVenta: "mantencion",
      nCuotas: 1,
      cuotas: (() => {
        const c = empty4();
        c[0] = { monto: 80, fecha: "" };
        return c;
      })(),
    };
    const base: F1Data = {
      ...F1_INITIAL,
      serviciosContratados: [
        svc({
          id: "m1",
          tipoVenta: "mantencion",
          precioUnitario: 100,
          cantidad: 2,
          total: 200,
        }),
      ],
      formasPagoMantencion: [fp],
    };
    const r = reconcileFormasPagoDesdeServicios(base);
    const row = r.formasPagoMantencion[0];
    expect(row.linkedServicioTotal).toBe(200);
    expect(row.cuotas[0].monto).toBe(80);
  });

  it("computeTotalDescuentoMantencion suma descuentos por cuota de gracia", () => {
    const fp: FormaPago = {
      id: "fp1",
      item: 1,
      linkedServicioId: "m1",
      linkedServicioTotal: 200,
      linkedServicioPrecioUnitario: 200,
      tipoVenta: "mantencion",
      nCuotas: 2,
      cuotas: (() => {
        const c = empty4();
        c[0] = { monto: 150, fecha: "" };
        c[1] = { monto: 150, fecha: "" };
        return c;
      })(),
    };
    const data: F1Data = {
      ...F1_INITIAL,
      serviciosContratados: [
        svc({
          id: "m1",
          tipoVenta: "mantencion",
          precioUnitario: 200,
          total: 200,
        }),
      ],
      formasPagoMantencion: [fp],
      total_descuento_mantencion: 0,
    };
    expect(computeTotalDescuentoMantencion(data)).toBe(100);
  });

});

describe("distributeTotalAcrossCuotas", () => {
  it("distribuye equitativamente montos divisibles", () => {
    const cuotas = distributeTotalAcrossCuotas(200, 2);
    expect(cuotas[0].monto).toBe(100);
    expect(cuotas[1].monto).toBe(100);
  });

  it("asigna el remanente a la última cuota", () => {
    const cuotas = distributeTotalAcrossCuotas(100, 3);
    expect(cuotas[0].monto).toBe(33.33);
    expect(cuotas[1].monto).toBe(33.33);
    expect(cuotas[2].monto).toBe(33.34);
  });

  it("soporta 1 cuota (todo a la primera)", () => {
    const cuotas = distributeTotalAcrossCuotas(500, 1);
    expect(cuotas[0].monto).toBe(500);
    expect(cuotas[1].monto).toBe(0);
  });

  it("soporta 4 cuotas", () => {
    const cuotas = distributeTotalAcrossCuotas(1000, 4);
    expect(cuotas[0].monto).toBe(250);
    expect(cuotas[1].monto).toBe(250);
    expect(cuotas[2].monto).toBe(250);
    expect(cuotas[3].monto).toBe(250);
  });

  it("retorna ceros si el total es 0", () => {
    const cuotas = distributeTotalAcrossCuotas(0, 3);
    expect(cuotas[0].monto).toBe(0);
    expect(cuotas[1].monto).toBe(0);
    expect(cuotas[2].monto).toBe(0);
  });

  it("clampa nCuotas a 1 mínimo", () => {
    const cuotas = distributeTotalAcrossCuotas(100, 0);
    expect(cuotas[0].monto).toBe(100);
  });

  it("clampa nCuotas a 4 máximo", () => {
    const cuotas = distributeTotalAcrossCuotas(200, 5);
    expect(cuotas[0].monto).toBe(50);
    expect(cuotas[1].monto).toBe(50);
    expect(cuotas[2].monto).toBe(50);
    expect(cuotas[3].monto).toBe(50);
  });

  it("preserva fechas desde baseCuotas", () => {
    const base = [
      { monto: 0, fecha: "2026-01-01" },
      { monto: 0, fecha: "2026-02-01" },
      { monto: 0, fecha: "" },
      { monto: 0, fecha: "" },
    ];
    const cuotas = distributeTotalAcrossCuotas(300, 2, base);
    expect(cuotas[0].fecha).toBe("2026-01-01");
    expect(cuotas[1].fecha).toBe("2026-02-01");
    expect(cuotas[0].monto).toBe(150);
    expect(cuotas[1].monto).toBe(150);
  });

  it("maneja precisión con decimales (round centavos)", () => {
    const cuotas = distributeTotalAcrossCuotas(10.01, 3);
    const total = cuotas.reduce((s, c) => s + c.monto, 0);
    expect(Math.round(total * 100) / 100).toBe(10.01);
  });
});
