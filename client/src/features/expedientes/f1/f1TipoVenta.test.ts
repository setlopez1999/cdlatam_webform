import { describe, it, expect } from "vitest";
import {
  matchesKeywords,
  categoriaPagoServicio,
  isTipoImplementacion,
  isTipoMantencion,
  IMPLEMENTACION_KEYWORDS,
  MANTENCION_KEYWORDS,
} from "./f1TipoVenta";

describe("matchesKeywords", () => {
  it("detecta 'implementacion' en varias formas", () => {
    expect(matchesKeywords("Implementación", IMPLEMENTACION_KEYWORDS)).toBe(true);
    expect(matchesKeywords("implementacion", IMPLEMENTACION_KEYWORDS)).toBe(true);
    expect(matchesKeywords("Impl", IMPLEMENTACION_KEYWORDS)).toBe(true);
    expect(matchesKeywords("Software Implementation", IMPLEMENTACION_KEYWORDS)).toBe(true);
  });

  it("detecta 'mantencion' en varias formas", () => {
    expect(matchesKeywords("Mantención", MANTENCION_KEYWORDS)).toBe(true);
    expect(matchesKeywords("mantencion", MANTENCION_KEYWORDS)).toBe(true);
    expect(matchesKeywords("Mant", MANTENCION_KEYWORDS)).toBe(true);
  });

  it("retorna false si no hay match", () => {
    expect(matchesKeywords("Soporte", IMPLEMENTACION_KEYWORDS)).toBe(false);
    expect(matchesKeywords("", IMPLEMENTACION_KEYWORDS)).toBe(false);
    expect(matchesKeywords("  ", IMPLEMENTACION_KEYWORDS)).toBe(false);
  });
});

describe("categoriaPagoServicio", () => {
  it("retorna 'impl' para tipos de implementación", () => {
    expect(categoriaPagoServicio("Implementación")).toBe("impl");
    expect(categoriaPagoServicio("implementacion directa")).toBe("impl");
  });

  it("retorna 'mant' para tipos de mantención", () => {
    expect(categoriaPagoServicio("Mantención")).toBe("mant");
    expect(categoriaPagoServicio("mantencion anual")).toBe("mant");
  });

  it("retorna null para tipos no clasificables", () => {
    expect(categoriaPagoServicio("Capacitación")).toBeNull();
    expect(categoriaPagoServicio("")).toBeNull();
  });
});

describe("isTipoImplementacion / isTipoMantencion", () => {
  it("isTipoImplementacion true para implementación", () => {
    expect(isTipoImplementacion("Implementación")).toBe(true);
    expect(isTipoImplementacion("Mantención")).toBe(false);
  });

  it("isTipoMantencion true para mantención", () => {
    expect(isTipoMantencion("Mantención")).toBe(true);
    expect(isTipoMantencion("Implementación")).toBe(false);
  });
});
