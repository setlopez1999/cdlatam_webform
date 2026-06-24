import { describe, it, expect } from "vitest";
import {
  deriveFilasCosto,
  deriveFilasRRHH,
  deriveFilasOtros,
  normalizeFilasCosto,
  normalizeFilasRRHH,
  updateCostRowInList,
  updateRRHHRowInList,
  updateOtrosRowInList,
  appendCostoAtCuota,
  appendRRHHAtCuota,
  sumTotalesPorCuota,
  sumOtrosPorMes,
  recalcFilaCosto,
  recalcFilaRRHH,
  recalcFilaOtros,
  removeRowById,
  clampNCuotas,
  newFilaCosto,
  newFilaRRHH,
  newFilaOtros,
} from "./f2RowDerivation";
import type { FilaCosto, FilaRRHH, FilaOtros } from "../types";

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

const blankRRHH = (overrides: Partial<FilaRRHH> & { id: string }): FilaRRHH => ({
  tipo: "tecnico_interno",
  label: "",
  centroCosto: "",
  valorSinImpuesto: 0,
  tipoMoneda: "USD",
  cantidad: 1,
  totalNeto: 0,
  impuesto: 0,
  total: 0,
  descripcionGasto: "",
  observacion: "",
  ...overrides,
});

const blankOtros = (overrides: Partial<FilaOtros> & { id: string }): FilaOtros => ({
  tipo: "varios",
  label: "",
  centroCosto: "",
  valorNeto: 0,
  tipoMoneda: "USD",
  cantidad: 1,
  totalNeto: 0,
  iva: 0,
  total: 0,
  descripcionGasto: "",
  observacion: "",
  mes: 1,
  ...overrides,
});

describe("clampNCuotas", () => {
  it("clampa entre 1 y 4", () => {
    expect(clampNCuotas(0)).toBe(1);
    expect(clampNCuotas(1)).toBe(1);
    expect(clampNCuotas(3)).toBe(3);
    expect(clampNCuotas(4)).toBe(4);
    expect(clampNCuotas(5)).toBe(4);
  });
});

describe("newFilaCosto / newFilaRRHH / newFilaOtros", () => {
  it("newFilaCosto crea fila con cuota asignada", () => {
    const f = newFilaCosto(2);
    expect(f.cuota).toBe(2);
    expect(f.id).toBeTruthy();
    expect(f.total).toBe(0);
  });

  it("newFilaRRHH crea fila con cuota asignada", () => {
    const f = newFilaRRHH(3);
    expect(f.cuota).toBe(3);
    expect(f.tipo).toBe("tecnico_interno");
  });

  it("newFilaOtros crea fila con mes y tipo", () => {
    const f = newFilaOtros("comision", "Comisión", 2);
    expect(f.mes).toBe(2);
    expect(f.tipo).toBe("comision");
    expect(f.label).toBe("Comisión");
  });
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

describe("normalizeFilasRRHH", () => {
  it("asigna cuota por orden a filas RRHH legacy", () => {
    const legacy: FilaRRHH[] = [
      blankRRHH({ id: "r1", total: 100 }),
      blankRRHH({ id: "r2", total: 200 }),
    ];
    const out = normalizeFilasRRHH(legacy);
    expect(out[0].cuota).toBe(1);
    expect(out[1].cuota).toBe(2);
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

describe("deriveFilasRRHH", () => {
  it("devuelve filas RRHH agrupadas por cuota", () => {
    const stored: FilaRRHH[] = [
      blankRRHH({ id: "r1", cuota: 2, total: 500 }),
      blankRRHH({ id: "r2", cuota: 1, total: 300 }),
    ];
    const rows = deriveFilasRRHH(stored, 3);
    expect(rows.map(r => r.id)).toEqual(["r2", "r1"]);
  });
});

describe("deriveFilasOtros", () => {
  it("usa ITEMS_FIJOS como placeholder para meses sin filas", () => {
    const rows = deriveFilasOtros([], 1, "USD");
    expect(rows.length).toBeGreaterThanOrEqual(8);
    expect(rows.every(r => r.mes === 1)).toBe(true);
  });

  it("mezcla filas existentes con placeholders", () => {
    const stored: FilaOtros[] = [blankOtros({ id: "o1", mes: 2, total: 999, tipo: "comision", label: "Comi" })];
    const rows = deriveFilasOtros(stored, 2, "USD");
    const existing = rows.filter(r => r.id === "o1");
    expect(existing).toHaveLength(1);
    expect(existing[0].total).toBe(999);
    const placeholders = rows.filter(r => r.id.startsWith("__f2_otros"));
    expect(placeholders.length).toBeGreaterThan(0);
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

describe("appendRRHHAtCuota", () => {
  it("añade fila RRHH con cuota indicada", () => {
    const stored = [blankRRHH({ id: "r1", cuota: 1 })];
    const next = appendRRHHAtCuota(stored, 2);
    expect(next).toHaveLength(2);
    expect(next[1].cuota).toBe(2);
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

describe("sumOtrosPorMes", () => {
  it("suma filas otros por mes", () => {
    const rows: FilaOtros[] = [
      blankOtros({ id: "o1", mes: 2, total: 1000 }),
      blankOtros({ id: "o2", mes: 2, total: 500 }),
      blankOtros({ id: "o3", mes: 1, total: 200 }),
    ];
    expect(sumOtrosPorMes(rows, 2)).toBe(1500);
  });
});

describe("recalcFilaCosto", () => {
  it("recalcula totalNeto y total al cambiar valorNeto", () => {
    const row = blankCosto({ id: "a", valorNeto: 100, cantidad: 2 });
    const updated = recalcFilaCosto(row, "valorNeto", 50);
    expect(updated.valorNeto).toBe(50);
    expect(updated.totalNeto).toBe(100);
    expect(updated.total).toBe(100);
  });

  it("recalcula total al cambiar iva", () => {
    const row = blankCosto({ id: "a", valorNeto: 100, totalNeto: 100, iva: 0, total: 100 });
    const updated = recalcFilaCosto(row, "iva", 19);
    expect(updated.iva).toBe(19);
    expect(updated.total).toBe(119);
  });
});

describe("recalcFilaRRHH", () => {
  it("recalcula totalNeto y total al cambiar valorSinImpuesto", () => {
    const row = blankRRHH({ id: "r1", valorSinImpuesto: 100, cantidad: 2 });
    const updated = recalcFilaRRHH(row, "valorSinImpuesto", 80);
    expect(updated.valorSinImpuesto).toBe(80);
    expect(updated.totalNeto).toBe(160);
    expect(updated.total).toBe(160);
  });

  it("recalcula total al cambiar impuesto", () => {
    const row = blankRRHH({ id: "r1", totalNeto: 200, impuesto: 0, total: 200 });
    const updated = recalcFilaRRHH(row, "impuesto", 30);
    expect(updated.total).toBe(230);
  });
});

describe("recalcFilaOtros", () => {
  it("recalcula totalNeto y total al cambiar valorNeto", () => {
    const row = blankOtros({ id: "o1", valorNeto: 100 });
    const updated = recalcFilaOtros(row, "valorNeto", 75);
    expect(updated.valorNeto).toBe(75);
    expect(updated.totalNeto).toBe(75);
    expect(updated.total).toBe(75);
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

  it("retorna stored si fila no existe (no hay placeholders para costo)", () => {
    const stored: FilaCosto[] = [];
    const updated = updateCostRowInList(stored, 2, "nonexistent", "valorNeto", 500);
    expect(updated).toEqual([]);
  });
});

describe("updateRRHHRowInList", () => {
  it("actualiza fila RRHH existente", () => {
    const stored: FilaRRHH[] = [
      blankRRHH({ id: "r1", valorSinImpuesto: 100, totalNeto: 100, total: 100 }),
    ];
    const updated = updateRRHHRowInList(stored, 2, "r1", "valorSinImpuesto", 300);
    expect(updated).toHaveLength(1);
    expect(updated[0].valorSinImpuesto).toBe(300);
    expect(updated[0].totalNeto).toBe(300);
  });

  it("retorna stored si fila no existe (no hay placeholders para RRHH)", () => {
    const updated = updateRRHHRowInList([], 1, "nonexistent", "valorSinImpuesto", 200);
    expect(updated).toEqual([]);
  });
});

describe("updateOtrosRowInList", () => {
  it("actualiza fila otros existente", () => {
    const stored: FilaOtros[] = [blankOtros({ id: "o1", valorNeto: 50, totalNeto: 50, total: 50 })];
    const updated = updateOtrosRowInList(stored, 2, "USD", "o1", "valorNeto", 120);
    expect(updated).toHaveLength(1);
    expect(updated[0].valorNeto).toBe(120);
    expect(updated[0].totalNeto).toBe(120);
  });

  it("agrega fila otros desde placeholder si no existe en stored", () => {
    const stored: FilaOtros[] = [];
    const updated = updateOtrosRowInList(stored, 1, "USD", "__f2_otros_c1_i0", "valorNeto", 300);
    expect(updated).toHaveLength(1);
    expect(updated[0].id).toBe("__f2_otros_c1_i0");
    expect(updated[0].tipo).toBe("comision");
    expect(updated[0].valorNeto).toBe(300);
    expect(updated[0].totalNeto).toBe(300);
  });
});

describe("removeRowById", () => {
  it("elimina fila por id", () => {
    const stored: FilaCosto[] = [
      blankCosto({ id: "a", total: 100 }),
      blankCosto({ id: "b", total: 200 }),
    ];
    expect(removeRowById(stored, "a")).toHaveLength(1);
    expect(removeRowById(stored, "nonexistent")).toHaveLength(2);
  });
});
