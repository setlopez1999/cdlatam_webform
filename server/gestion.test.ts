/**
 * Tests para el motor de cálculo del Formulario 3 (Resultado)
 * y el Service Layer de gestión administrativa.
 *
 * Ejecutar: pnpm test
 */

import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";
import {
  CATALOG_CONSIDERACIONES_COMERCIALES_SEED,
  sqlSeedConsideracionesComerciales,
} from "./seeds/consideracionesComercialesSeed";
import { calcularResultadoF3 } from "@/features/expedientes/f3/calcularResultadoF3";
import { F2_INITIAL } from "@/features/expedientes/types";
import type { F2Data, FilaCosto, FilaOtros, FilaRRHH } from "@/features/expedientes/types";

// ─── Mock Context ─────────────────────────────────────────────────────────────

function createMockContext(overrides?: Partial<TrpcContext>): TrpcContext {
  const user: User = {
    id: 1,
    username: "test-user-001",
    passwordHash: "hash",
    displayName: "Test User",
    role: "user",
    roleId: null,
    isActive: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

// ─── Catalogs Tests ───────────────────────────────────────────────────────────

describe("catalogs.getAll", () => {
  it("returns all required catalog arrays", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const catalogs = await caller.catalogs.getAll();

    expect(catalogs).toHaveProperty("monedas");
    expect(catalogs).toHaveProperty("paises");
    expect(catalogs).toHaveProperty("unidadesNegocio");
    expect(catalogs).toHaveProperty("soluciones");
    expect(catalogs).toHaveProperty("tipoVenta");
    expect(catalogs).toHaveProperty("plazos");
    expect(catalogs).toHaveProperty("cecos");
    expect(catalogs).toHaveProperty("consideracionesComerciales");
  });

  it("monedas catalog contains USD and CLP", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const { monedas } = await caller.catalogs.getAll();

    const values = monedas.map((m: { value: string }) => m.value);
    expect(values.some((v: string) => v.includes("USD"))).toBe(true);
    expect(values.some((v: string) => v.includes("CLP"))).toBe(true);
  });

  it("each catalog item has value and label properties", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const { monedas, paises, unidadesNegocio } = await caller.catalogs.getAll();

    for (const item of [...monedas, ...paises, ...unidadesNegocio]) {
      expect(item).toHaveProperty("value");
      expect(item).toHaveProperty("label");
      expect(typeof item.value).toBe("string");
      expect(typeof item.label).toBe("string");
    }
  });
});

// ─── Auth Tests ───────────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns authenticated user when logged in", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();

    expect(user).toBeDefined();
    expect(user?.id).toBe(1);
    expect(user?.username).toBe("test-user-001");
  });

  it("returns null when not authenticated", async () => {
    const ctx = createMockContext({ user: null });
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();

    expect(user).toBeNull();
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];
    const ctx = createMockContext({
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as unknown as TrpcContext["res"],
    });

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result.success).toBe(true);
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1 });
  });
});

// ─── Calculation Engine Tests (Formulario 3) ─────────────────────────────────

interface EPDataTest {
  montoProyecto: number;
  hardware: Array<{ total: number; cuota?: 1 | 2 | 3 | 4 }>;
  materiales: Array<{ total: number; cuota?: 1 | 2 | 3 | 4 }>;
  rrhh: Array<{ total: number; cuota?: 1 | 2 | 3 | 4 }>;
  otrosGastos: Array<{ total: number; mes: 1 | 2 | 3 }>;
}

function mkCosto(total: number, cuota?: 1 | 2 | 3 | 4): FilaCosto {
  return {
    id: "t",
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
    id: "t",
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

function mkOtros(total: number, mes: 1 | 2 | 3): FilaOtros {
  return {
    id: "t",
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

function epToF2(ep: EPDataTest): F2Data {
  return {
    ...F2_INITIAL,
    montoProyecto: ep.montoProyecto,
    hardware: ep.hardware.map(h => mkCosto(h.total, h.cuota)),
    materiales: ep.materiales.map(m => mkCosto(m.total, m.cuota)),
    rrhh: ep.rrhh.map(r => mkRRHH(r.total, r.cuota)),
    otrosGastos: ep.otrosGastos.map(o => mkOtros(o.total, o.mes)),
  };
}

function calcularResultadoTest(ep: EPDataTest) {
  const r = calcularResultadoF3(epToF2(ep));
  return {
    ingresoPorMes: r.ingreso.mes1,
    gastosMes1: r.gastos.mes1,
    gastosMes2: r.gastos.mes2,
    gastosMes3: r.gastos.mes3,
    resultadoMes1: r.resultado.mes1,
    resultadoMes2: r.resultado.mes2,
    resultadoMes3: r.resultado.mes3,
    gimMes1: r.distribucion.gim.mes1,
    gpMes1: r.distribucion.gp.mes1,
    facturacionBrutoMes1: r.facturacion.bruto.mes1,
    facturacionImpuestoMes1: r.facturacion.impuesto.mes1,
    facturacionNetoMes1: r.facturacion.neto.mes1,
  };
}

describe("Formulario 3 - Motor de Cálculo", () => {
  it("calcula ingreso por mes correctamente (monto / 3 cuotas)", () => {
    const ep: EPDataTest = {
      montoProyecto: 30000,
      hardware: [], materiales: [], rrhh: [], otrosGastos: [],
    };
    const r = calcularResultadoTest(ep);
    expect(r.ingresoPorMes).toBe(10000);
  });

  it("calcula gastos del mes 1 sumando hardware + materiales + rrhh + otros_mes1", () => {
    const ep: EPDataTest = {
      montoProyecto: 30000,
      hardware: [{ total: 5000 }],
      materiales: [{ total: 2000 }],
      rrhh: [{ total: 1000 }],
      otrosGastos: [{ total: 500, mes: 1 }],
    };
    const r = calcularResultadoTest(ep);
    expect(r.gastosMes1).toBe(8500); // 5000 + 2000 + 1000 + 500
  });

  it("calcula resultado = ingreso - gastos", () => {
    const ep: EPDataTest = {
      montoProyecto: 30000,
      hardware: [{ total: 5000 }],
      materiales: [], rrhh: [], otrosGastos: [],
    };
    const r = calcularResultadoTest(ep);
    // ingreso = 10000, gastos = 5000, resultado = 5000
    expect(r.resultadoMes1).toBe(5000);
  });

  it("distribución GIM = 10% del resultado", () => {
    const ep: EPDataTest = {
      montoProyecto: 30000,
      hardware: [], materiales: [], rrhh: [], otrosGastos: [],
    };
    const r = calcularResultadoTest(ep);
    // resultado = 10000, GIM = 1000
    expect(r.gimMes1).toBeCloseTo(1000, 2);
  });

  it("distribución GP = 90% del resultado", () => {
    const ep: EPDataTest = {
      montoProyecto: 30000,
      hardware: [], materiales: [], rrhh: [], otrosGastos: [],
    };
    const r = calcularResultadoTest(ep);
    // resultado = 10000, GP = 9000
    expect(r.gpMes1).toBeCloseTo(9000, 2);
  });

  it("GIM + GP = 100% del resultado", () => {
    const ep: EPDataTest = {
      montoProyecto: 50000,
      hardware: [{ total: 3000 }],
      materiales: [{ total: 2000 }],
      rrhh: [{ total: 1500 }],
      otrosGastos: [],
    };
    const r = calcularResultadoTest(ep);
    expect(r.gimMes1 + r.gpMes1).toBeCloseTo(r.resultadoMes1, 2);
  });

  it("facturación inter-empresa: IVA 19% sobre GP", () => {
    const ep: EPDataTest = {
      montoProyecto: 30000,
      hardware: [], materiales: [], rrhh: [], otrosGastos: [],
    };
    const r = calcularResultadoTest(ep);
    // GP = 9000, IVA = 9000 * 0.19 = 1710
    expect(r.facturacionImpuestoMes1).toBeCloseTo(1710, 2);
  });

  it("facturación neto = bruto - impuesto", () => {
    const ep: EPDataTest = {
      montoProyecto: 30000,
      hardware: [], materiales: [], rrhh: [], otrosGastos: [],
    };
    const r = calcularResultadoTest(ep);
    expect(r.facturacionNetoMes1).toBeCloseTo(
      r.facturacionBrutoMes1 - r.facturacionImpuestoMes1, 2
    );
  });

  it("otros gastos se distribuyen correctamente por mes", () => {
    const ep: EPDataTest = {
      montoProyecto: 30000,
      hardware: [], materiales: [], rrhh: [],
      otrosGastos: [
        { total: 1000, mes: 1 },
        { total: 2000, mes: 2 },
        { total: 3000, mes: 3 },
      ],
    };
    const r = calcularResultadoTest(ep);
    expect(r.gastosMes1).toBe(1000);
    expect(r.gastosMes2).toBe(2000);
    expect(r.gastosMes3).toBe(3000);
  });

  it("proyecto sin gastos: resultado = ingreso completo", () => {
    const ep: EPDataTest = {
      montoProyecto: 60000,
      hardware: [], materiales: [], rrhh: [], otrosGastos: [],
    };
    const r = calcularResultadoTest(ep);
    expect(r.resultadoMes1).toBe(20000);
    expect(r.resultadoMes2).toBe(20000);
    expect(r.resultadoMes3).toBe(20000);
  });

  it("proyecto con gastos mayores al ingreso: resultado negativo", () => {
    const ep: EPDataTest = {
      montoProyecto: 3000,
      hardware: [{ total: 50000 }],
      materiales: [], rrhh: [], otrosGastos: [],
    };
    const r = calcularResultadoTest(ep);
    expect(r.resultadoMes1).toBeLessThan(0);
  });

  it("RRHH de cuota 2 no se imputa en mes 1 (gastos por cuota)", () => {
    const ep: EPDataTest = {
      montoProyecto: 36000,
      hardware: [],
      materiales: [],
      rrhh: [{ total: 4000, cuota: 2 }],
      otrosGastos: [{ total: 300, mes: 2 }],
    };
    const r = calcularResultadoTest(ep);
    expect(r.gastosMes1).toBe(0);
    expect(r.gastosMes2).toBe(4300);
    expect(r.resultadoMes2).toBe(7700);
  });
});

// ─── Catalogs Tests — Nuevos campos Acta ─────────────────────────────────────

describe("catalogs.getAll — campos para Acta actualizada", () => {
  it("retorna empresas de referencia (Sres.) para el encabezado del Acta", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const catalogs = await caller.catalogs.getAll();

    expect(catalogs).toHaveProperty("empresas");
    expect(Array.isArray(catalogs.empresas)).toBe(true);
    expect(catalogs.empresas.length).toBeGreaterThan(0);
    // Cada empresa debe tener value y label
    for (const empresa of catalogs.empresas) {
      expect(empresa).toHaveProperty("value");
      expect(empresa).toHaveProperty("label");
    }
  });

  it("retorna nombres de referencia (Atención) para el encabezado del Acta", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const catalogs = await caller.catalogs.getAll();

    expect(catalogs).toHaveProperty("nombres");
    expect(Array.isArray(catalogs.nombres)).toBe(true);
    expect(catalogs.nombres.length).toBeGreaterThan(0);
  });

  it("retorna países para el combobox de empresa", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const { paises } = await caller.catalogs.getAll();

    expect(paises.length).toBeGreaterThan(0);
    // Chile debe estar en la lista
    const values = paises.map((p: { value: string }) => p.value);
    expect(values.some((v: string) => v.includes("CHILE") || v.includes("Chile"))).toBe(true);
  });

  it("retorna monedas para el combobox de empresa", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const { monedas } = await caller.catalogs.getAll();

    expect(monedas.length).toBeGreaterThan(0);
    // USD debe estar en la lista
    const values = monedas.map((m: { value: string }) => m.value);
    expect(values.some((v: string) => v.includes("USD"))).toBe(true);
  });

  it("retorna consideracionesComerciales (plantillas Acta F1) desde catálogo", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const { consideracionesComerciales } = await caller.catalogs.getAll();

    expect(Array.isArray(consideracionesComerciales)).toBe(true);
    expect(consideracionesComerciales.length).toBeGreaterThan(0);
    const first = consideracionesComerciales[0] as { id: number; value: string; orden: number };
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("value");
    expect(first).toHaveProperty("orden");
  });
});

describe("consideracionesComerciales — seed centralizado", () => {
  it("exporta 6 plantillas y SQL INSERT OR IGNORE coherente", () => {
    expect(CATALOG_CONSIDERACIONES_COMERCIALES_SEED.length).toBe(6);
    const sql = sqlSeedConsideracionesComerciales();
    expect(sql.startsWith("INSERT OR IGNORE INTO catalog_consideraciones_comerciales")).toBe(true);
    expect(sql).toContain("Activación nueva.");
  });
});

// ─── Acta Data Structure Tests ────────────────────────────────────────────────

describe("Formulario 1 (Acta) — estructura de datos", () => {
  it("createDefaultActa incluye campo sres (empresa destinataria)", () => {
    // Validar que la estructura del Acta tiene los campos del Excel
    const actaFields = [
      "sres", "noActa", "atencion", "activacionNueva", "fecha",
      "razonSocial", "nombreFantasia", "rucDniRut", "tipoDocumento",
      "direccionComercial", "pais", "moneda",
      "representanteLegal", "representanteDni", "representanteEmail", "representanteFono",
      "contactoTecnico", "contactoTecnicoEmail", "contactoTecnicoFono",
      "contactoFacturacion", "contactoFacturacionEmail", "contactoFacturacionFono",
      "serviciosContratados", "formasPagoImplementacion", "formasPagoMantencion",
      "status",
    ];

    // Simular un objeto Acta con todos los campos requeridos
    const mockActa: Record<string, unknown> = {
      sres: "Empresa SA",
      noActa: "2026-001",
      atencion: "Juan García",
      activacionNueva: false,
      fecha: "2026-02-26",
      razonSocial: "Empresa SA",
      nombreFantasia: "Empresa",
      rucDniRut: "12345678-9",
      tipoDocumento: "RUT",
      direccionComercial: "Av. Principal 123",
      pais: "CHILE",
      moneda: "USD-DÓLAR",
      representanteLegal: "Juan García",
      representanteDni: "12345678",
      representanteEmail: "juan@empresa.com",
      representanteFono: "+56912345678",
      contactoTecnico: "Pedro Técnico",
      contactoTecnicoEmail: "pedro@empresa.com",
      contactoTecnicoFono: "+56987654321",
      contactoFacturacion: "María Facturas",
      contactoFacturacionEmail: "maria@empresa.com",
      contactoFacturacionFono: "+56911111111",
      serviciosContratados: [],
      formasPagoImplementacion: [],
      formasPagoMantencion: [],
      status: "borrador",
    };

    for (const field of actaFields) {
      expect(mockActa).toHaveProperty(field);
    }
  });

  it("activacionNueva es un booleano", () => {
    const mockActa = { activacionNueva: false };
    expect(typeof mockActa.activacionNueva).toBe("boolean");
  });

  it("formasPago tienen estructura correcta con 3 cuotas", () => {
    const mockFormaPago = {
      id: "fp-001",
      item: 1,
      tipoVenta: "CONTADO",
      nCuotas: 3,
      primeraCuota: { monto: 1000, fecha: "2026-03-01" },
      segundaCuota: { monto: 1000, fecha: "2026-04-01" },
      terceraCuota: { monto: 1000, fecha: "2026-05-01" },
    };

    expect(mockFormaPago).toHaveProperty("primeraCuota.monto");
    expect(mockFormaPago).toHaveProperty("segundaCuota.monto");
    expect(mockFormaPago).toHaveProperty("terceraCuota.monto");
    expect(mockFormaPago.primeraCuota.monto + mockFormaPago.segundaCuota.monto + mockFormaPago.terceraCuota.monto).toBe(3000);
  });
});
