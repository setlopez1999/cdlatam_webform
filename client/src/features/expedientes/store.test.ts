import { describe, it, expect, beforeEach } from "vitest";
import {
  storeUpdateF2,
  storeGuardarF2,
  storeMergeDetalleEnStore,
  getExpedienteFromState,
} from "./store";
import { F1_INITIAL, F2_INITIAL } from "./types";
import type { Expediente } from "./types";

function makeExp(id: number, overrides?: Partial<Expediente>): Expediente {
  const now = new Date().toISOString();
  return {
    id,
    nombre: `Exp ${id}`,
    creadorId: 0,
    status: "nuevo",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    f1: { data: { ...F1_INITIAL }, status: "nuevo" },
    f2: { data: { ...F2_INITIAL }, status: "nuevo" },
    f3: { status: "nuevo" },
    ...overrides,
  };
}

describe("storeMergeDetalleEnStore", () => {
  beforeEach(() => {
    // Nota: _state es singleton en el módulo; usamos IDs únicos por test
    // para evitar interferencias entre tests.
  });

  it("inserta nuevo expediente en store vacío", () => {
    const exp = makeExp(1000);
    storeMergeDetalleEnStore(exp);
    expect(getExpedienteFromState(1000)?.id).toBe(1000);
  });

  it("reemplaza expediente existente con el mismo id", () => {
    storeMergeDetalleEnStore(makeExp(1001, { nombre: "Original" }));
    storeMergeDetalleEnStore(makeExp(1001, { nombre: "Reemplazado" }));
    expect(getExpedienteFromState(1001)?.nombre).toBe("Reemplazado");
  });
});

describe("storeUpdateF2", () => {
  beforeEach(() => {
    storeMergeDetalleEnStore(makeExp(2000));
  });

  it("actualiza campos parciales de F2", () => {
    storeUpdateF2(2000, { montoProyecto: 50000, nombreCliente: "ACME" });
    const exp = getExpedienteFromState(2000);
    expect(exp?.f2.data.montoProyecto).toBe(50000);
    expect(exp?.f2.data.nombreCliente).toBe("ACME");
  });

  it("marca F2 como sin_guardar cuando estaba nuevo", () => {
    storeUpdateF2(2000, { montoProyecto: 999 });
    const exp = getExpedienteFromState(2000);
    expect(exp?.f2.status).toBe("sin_guardar");
  });

  it("cambia guardado → sin_guardar al actualizar", () => {
    storeGuardarF2(2000);
    storeUpdateF2(2000, { descripcion: "cambio" });
    const exp = getExpedienteFromState(2000);
    expect(exp?.f2.status).toBe("sin_guardar");
  });
});

describe("storeGuardarF2", () => {
  beforeEach(() => {
    storeMergeDetalleEnStore(makeExp(3000));
  });

  it("marca F2 como guardado y registra savedAt", () => {
    storeGuardarF2(3000);
    const exp = getExpedienteFromState(3000);
    expect(exp?.f2.status).toBe("guardado");
    expect(exp?.f2.savedAt).toBeDefined();
  });

  it("aplica parcial y marca guardado", () => {
    storeGuardarF2(3000, { nombreCliente: "Nuevo Cliente" });
    const exp = getExpedienteFromState(3000);
    expect(exp?.f2.status).toBe("guardado");
    expect(exp?.f2.data.nombreCliente).toBe("Nuevo Cliente");
  });

  it("marca F3 como sin_guardar al guardar F2", () => {
    storeGuardarF2(3000);
    expect(getExpedienteFromState(3000)?.f3.status).toBe("sin_guardar");
  });
});
