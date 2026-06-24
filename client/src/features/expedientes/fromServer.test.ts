import { describe, it, expect } from "vitest";
import {
  f2DataToEvalSyncData,
  mapDbEvaluacionToF2,
  mapDbActaToF1,
  mapResumenRowToExpediente,
  F2_SYNC_SCALAR_KEYS,
} from "./fromServer";
import { F1_INITIAL, F2_INITIAL } from "./types";

describe("F2 sync pipeline — campos escalares", () => {
  it("f2DataToEvalSyncData incluye centroCostoHeader", () => {
    const payload = f2DataToEvalSyncData({
      ...F2_INITIAL,
      centroCostoHeader: "CECO-IPTV",
      nombreCliente: "Cliente Test",
    });
    expect(payload.centroCostoHeader).toBe("CECO-IPTV");
  });

  it("mapDbEvaluacionToF2 restaura centroCostoHeader desde BD", () => {
    const { data } = mapDbEvaluacionToF2({
      centroCostoHeader: "CECO-MANT",
      nombreCliente: "ACME",
      hardware: [],
      materiales: [],
      rrhh: [],
      otrosGastos: [],
    });
    expect(data.centroCostoHeader).toBe("CECO-MANT");
  });

  it("F2_SYNC_SCALAR_KEYS cubre todos los escalares de encabezado (sin arrays)", () => {
    expect(F2_SYNC_SCALAR_KEYS).toContain("centroCostoHeader");
    expect(F2_SYNC_SCALAR_KEYS).toContain("nombreCliente");
    expect(F2_SYNC_SCALAR_KEYS).not.toContain("hardware" as never);
  });
});

describe("mapDbActaToF1", () => {
  it("retorna F1_INITIAL + status nuevo si acta es null", () => {
    const r = mapDbActaToF1(null);
    expect(r.data).toEqual(F1_INITIAL);
    expect(r.status).toBe("nuevo");
  });

  it("extrae campos desde f1Datos JSON", () => {
    const r = mapDbActaToF1({
      f1Datos: { razonSocial: "Razón Test", fecha: "2026-01-15" },
    });
    expect(r.data.razonSocial).toBe("Razón Test");
    expect(r.data.fecha).toBe("2026-01-15");
  });

  it("extrae campos legacy planos cuando no hay f1Datos", () => {
    const r = mapDbActaToF1({
      noActa: "A-001",
      razonSocial: "Empresa Legacy",
      fecha: "2026-03-01",
    });
    expect(r.data.noActa).toBe("A-001");
    expect(r.data.razonSocial).toBe("Empresa Legacy");
    expect(r.data.fecha).toBe("2026-03-01");
  });

  it("parsea arrays de servicios y formas de pago desde campos legacy", () => {
    const r = mapDbActaToF1({
      serviciosContratados: [{ id: "s1", tipoVenta: "impl", total: 100 }],
      formasPagoImplementacion: [{ id: "fp1", item: 1, nCuotas: 1, cuotas: [{ monto: 100, fecha: "" }] }],
    });
    expect(r.data.serviciosContratados).toHaveLength(1);
    expect(r.data.formasPagoImplementacion).toHaveLength(1);
  });

  it("status guardado cuando hay noActa en legacy", () => {
    const r = mapDbActaToF1({ noActa: "A-001" });
    expect(r.status).toBe("guardado");
  });

  it("respeta f1FormStatus cuando existe", () => {
    const r = mapDbActaToF1({ f1Datos: {}, f1FormStatus: "sin_guardar" });
    expect(r.status).toBe("sin_guardar");
  });
});

describe("mapDbEvaluacionToF2", () => {
  it("retorna F2_INITIAL + status nuevo si ev es null", () => {
    const r = mapDbEvaluacionToF2(null);
    expect(r.data).toEqual(F2_INITIAL);
    expect(r.status).toBe("nuevo");
  });

  it("aplica labels por defecto para RRHH y otros", () => {
    const r = mapDbEvaluacionToF2({
      rrhh: [{ id: "r1", tipo: "tecnico_interno" }],
      otrosGastos: [{ id: "o1", tipo: "comision" }],
      hardware: [],
      materiales: [],
    });
    expect(r.data.rrhh[0].label).toBe("Técnico interno");
    expect(r.data.otrosGastos[0].label).toBe("Comisión");
  });

  it("preserva labels existentes en RRHH y otros", () => {
    const r = mapDbEvaluacionToF2({
      rrhh: [{ id: "r1", tipo: "tecnico_interno", label: "Label Manual" }],
      otrosGastos: [{ id: "o1", tipo: "comision", label: "Comi Manual" }],
      hardware: [],
      materiales: [],
    });
    expect(r.data.rrhh[0].label).toBe("Label Manual");
    expect(r.data.otrosGastos[0].label).toBe("Comi Manual");
  });

  it("carga firmaImagen si existe", () => {
    const r = mapDbEvaluacionToF2({
      firmaImagen: "data:image/png;base64,abc",
      hardware: [],
      materiales: [],
      rrhh: [],
      otrosGastos: [],
    });
    expect(r.data.firmaImagen).toBe("data:image/png;base64,abc");
  });
});

describe("mapResumenRowToExpediente", () => {
  it("construye Expediente desde fila de resumen", () => {
    const row = {
      expediente: { id: 42, nombre: "Exp Test", creadorId: 1, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z" },
      acta: { noActa: "A-042", f1FormStatus: "guardado" },
      evaluacion: { hardware: [], materiales: [], rrhh: [], otrosGastos: [], f2FormStatus: "nuevo" },
      resultado: null,
    };
    const exp = mapResumenRowToExpediente(row);
    expect(exp.id).toBe(42);
    expect(exp.nombre).toBe("Exp Test");
    expect(exp.f1.status).toBe("guardado");
    expect(exp.f2.status).toBe("nuevo");
    expect(exp.f3.status).toBe("nuevo");
  });

  it("asigna serverNroActa desde row.acta.nroActa", () => {
    const row = {
      expediente: { id: 1, nombre: "E1", creadorId: 1, createdAt: "", updatedAt: "" },
      acta: { nroActa: 10001 },
      evaluacion: null,
      resultado: null,
    };
    const exp = mapResumenRowToExpediente(row);
    expect(exp.serverNroActa).toBe(10001);
  });
});
