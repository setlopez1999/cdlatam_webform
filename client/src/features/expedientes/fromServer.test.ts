import { describe, it, expect } from "vitest";
import { f2DataToEvalSyncData, mapDbEvaluacionToF2, F2_SYNC_SCALAR_KEYS } from "./fromServer";
import { F2_INITIAL } from "./types";

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
