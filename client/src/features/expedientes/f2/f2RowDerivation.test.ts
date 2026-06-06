import { describe, it, expect } from "vitest";
import {
  deriveFilasCosto,
  normalizeFilasCosto,
  updateCostRowInList,
  appendCostoAtCuota,
  sumTotalesPorCuota,
} from "./f2RowDerivation";
import type { FilaCosto } from "../types";

const blankCosto = (overrides: Partial<FilaCosto> & { id: string }): FilaCosto => ({
  centroCosto: "",
  descripcionGasto: "",
  valorNeto: 0,
  cantidad: 1,
  totalNeto: 0,
  iva: 0,
  total: 0,
  tipoMoneda: "USD",
  observacion: "",
  ...overrides,
});

describe("normalizeFilasCosto", () => {
  it("asigna cuota por orden a filas legacy sin cuota", () => {
    const legacy: FilaCosto[] = [
      blankCosto({ id: "a", valorNeto: 100, totalNeto: 100, total: 100 }),
      blankCosto({ id: "b", valorNeto: 200, totalNeto: 200, total: 200 }),
    ];
    const out = normalizeFilasCosto(legacy);
    expect(out[0].cuota).toBe(1);
    expect(out[1].cuota).toBe(2);
  });

  it("no modifica filas que ya tienen cuota", () => {
    const rows: FilaCosto[] = [
      blankCosto({ id: "a", cuota: 3, valorNeto: 50, totalNeto: 50, total: 50 }),
    ];
    expect(normalizeFilasCosto(rows)[0].cuota).toBe(3);
  });
});

describe("deriveFilasCosto", () => {
  it("devuelve solo filas existentes (sin placeholder por cuota vacía)", () => {
    const stored: FilaCosto[] = [
      blankCosto({ id: "hw1", cuota: 1, valorNeto: 500, totalNeto: 500, total: 500, descripcionGasto: "Servidor" }),
    ];
    const rows = deriveFilasCosto(stored, 2);
    expect(rows).toHaveLength(1);
    expect(rows[0].valorNeto).toBe(500);
    expect(rows[0].cuota).toBe(1);
  });

  it("store vacío → sin filas", () => {
    expect(deriveFilasCosto([], 3)).toEqual([]);
  });

  it("muestra varias filas de la misma cuota agrupadas por bloque", () => {
    const stored: FilaCosto[] = [
      blankCosto({ id: "c1", cuota: 1, total: 100 }),
      blankCosto({ id: "c2a", cuota: 2, total: 200 }),
      blankCosto({ id: "c2b", cuota: 2, total: 300 }),
      blankCosto({ id: "c3", cuota: 3, total: 400 }),
    ];
    const rows = deriveFilasCosto(stored, 3);
    expect(rows.map(r => r.id)).toEqual(["c1", "c2a", "c2b", "c3"]);
  });

  it("recupera filas legacy sin cuota por normalización", () => {
    const legacy: FilaCosto[] = [
      blankCosto({ id: "m1", valorNeto: 300, totalNeto: 300, total: 300, descripcionGasto: "Cable" }),
    ];
    const rows = deriveFilasCosto(legacy, 1);
    expect(rows[0].valorNeto).toBe(300);
    expect(rows[0].cuota).toBe(1);
  });
});

describe("appendCostoAtCuota", () => {
  it("añade fila con cuota indicada al final del store", () => {
    const stored = [blankCosto({ id: "a", cuota: 2, total: 50 })];
    const next = appendCostoAtCuota(stored, 2);
    expect(next).toHaveLength(2);
    expect(next[1].cuota).toBe(2);
    expect(next[1].id).not.toBe("a");
    const derived = deriveFilasCosto(next, 3);
    expect(derived.map(r => r.cuota)).toEqual([2, 2]);
  });
});

describe("sumTotalesPorCuota", () => {
  it("suma todas las filas de la misma cuota", () => {
    const rows = [
      blankCosto({ id: "a", cuota: 2, total: 1000 }),
      blankCosto({ id: "b", cuota: 2, total: 500 }),
      blankCosto({ id: "c", cuota: 1, total: 200 }),
    ];
    expect(sumTotalesPorCuota(rows, 2)).toBe(1500);
  });
});

describe("updateCostRowInList", () => {
  it("actualiza fila existente sin re-derivar todo el array", () => {
    const stored: FilaCosto[] = [
      blankCosto({ id: "hw1", cuota: 1, valorNeto: 100, totalNeto: 100, total: 100 }),
    ];
    const updated = updateCostRowInList(stored, 2, "hw1", "valorNeto", 250);
    expect(updated).toHaveLength(1);
    expect(updated[0].valorNeto).toBe(250);
    expect(updated[0].totalNeto).toBe(250);
  });
});
