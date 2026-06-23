/**
 * Mapea filas de SQLite (acta / evaluación / resultado) al shape Expediente del store.
 */
import type { inferRouterInputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";
import type { Expediente, F1Data, F2Data, FormStatus, F3Calculado } from "./types";

export type EvalSyncInput = inferRouterInputs<AppRouter>["evaluaciones"]["syncF2"]["data"];
import { F1_INITIAL, F2_INITIAL } from "./types";
import { normalizeFilasCosto } from "./f2/f2RowDerivation";

/**
 * Campos escalares de F2 que deben viajar store ↔ BD ↔ syncF2.
 * Si agregas un campo en F2Data (encabezado), inclúyelo aquí y en EvaluacionInputSchema.
 * Ver docs/F2_SYNC_PIPELINE.md
 */
export const F2_SYNC_SCALAR_KEYS = [
  "unidadNegocios",
  "empresa",
  "centroCostoHeader",
  "solucion",
  "tipoMoneda",
  "montoProyecto",
  "tipoCambio",
  "totalClp",
  "descripcion",
  "preventa",
  "fechaEntrega",
  "ejecutivoComercial",
  "plazoImplementacion",
  "propuestaNumero",
  "paisImplementacion",
  "rut",
  "nombreCliente",
  "nombreFantasia",
] as const satisfies readonly (keyof F2Data)[];

function f2ScalarsFromDb(ev: Record<string, unknown>): Pick<F2Data, (typeof F2_SYNC_SCALAR_KEYS)[number]> {
  const out = {} as Pick<F2Data, (typeof F2_SYNC_SCALAR_KEYS)[number]>;
  for (const key of F2_SYNC_SCALAR_KEYS) {
    if (key === "montoProyecto" || key === "tipoCambio" || key === "totalClp") {
      out[key] = (ev[key] != null ? Number(ev[key]) : null) as F2Data[typeof key];
    } else if (key === "fechaEntrega") {
      out[key] = isoDate(ev[key]);
    } else {
      out[key] = String(ev[key] ?? "") as F2Data[typeof key];
    }
  }
  return out;
}

function f2ScalarsToSync(d: F2Data): Pick<EvalSyncInput, (typeof F2_SYNC_SCALAR_KEYS)[number]> {
  const out = {} as Pick<EvalSyncInput, (typeof F2_SYNC_SCALAR_KEYS)[number]>;
  for (const key of F2_SYNC_SCALAR_KEYS) {
    if (key === "fechaEntrega") {
      (out as Record<string, unknown>)[key] = d.fechaEntrega || undefined;
    } else {
      (out as Record<string, unknown>)[key] = d[key];
    }
  }
  return out;
}

function asFormStatus(s: string | null | undefined, fallback: FormStatus): FormStatus {
  if (s === "nuevo" || s === "sin_guardar" || s === "guardado") return s;
  return fallback;
}

function isoDate(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") return new Date(v * 1000).toISOString().slice(0, 10);
  return "";
}

/** Convierte fila acta (Drizzle) → slot F1 */
export function mapDbActaToF1(acta: Record<string, unknown> | null): {
  data: F1Data;
  status: FormStatus;
  savedAt?: string;
} {
  if (!acta) {
    return { data: { ...F1_INITIAL }, status: "nuevo" };
  }
  const rawJson = acta.f1Datos;
  if (rawJson && typeof rawJson === "object") {
    const { firmaImagen: _omitFirma, ...restJson } = rawJson as Partial<F1Data> & Record<string, unknown>;
    const data = { ...F1_INITIAL, ...restJson } as F1Data;
    const saved = acta.f1SavedAt
      ? new Date(acta.f1SavedAt as string | number).toISOString()
      : undefined;
    return {
      data,
      status: asFormStatus(acta.f1FormStatus as string, "nuevo"),
      savedAt: saved,
    };
  }
  const fechaVal = acta.fecha;
  const data: F1Data = {
    ...F1_INITIAL,
    noActa: String(acta.noActa ?? ""),
    atencion: String(acta.atencion ?? ""),
    fecha: isoDate(fechaVal),
    razonSocial: String(acta.razonSocial ?? ""),
    nombreFantasia: String(acta.nombreFantasia ?? ""),
    rucDniRut: String(acta.rucDniRut ?? ""),
    direccionComercial: String(acta.direccionComercial ?? ""),
    representanteLegal: String(acta.representanteLegal ?? ""),
    representanteDni: String(acta.representanteDni ?? ""),
    representanteEmail: String(acta.representanteEmail ?? ""),
    ...splitPhone(String(acta.representanteFono ?? "")),
    contactoTecnico: String(acta.contactoTecnico ?? ""),
    contactoTecnicoEmail: String(acta.contactoTecnicoEmail ?? ""),
    ...splitPhone(String(acta.contactoTecnicoFono ?? ""), "contactoTecnico"),
    contactoFacturacion: String(acta.contactoFacturacion ?? ""),
    contactoFacturacionEmail: String(acta.contactoFacturacionEmail ?? ""),
    ...splitPhone(String(acta.contactoFacturacionFono ?? ""), "contactoFacturacion"),
    serviciosContratados: Array.isArray(acta.serviciosContratados)
      ? (acta.serviciosContratados as F1Data["serviciosContratados"])
      : [],
    formasPagoImplementacion: Array.isArray(acta.formasPagoImplementacion)
      ? (acta.formasPagoImplementacion as F1Data["formasPagoImplementacion"])
      : [],
    formasPagoMantencion: Array.isArray(acta.formasPagoMantencion)
      ? (acta.formasPagoMantencion as F1Data["formasPagoMantencion"])
      : [],
  };
  const saved = acta.f1SavedAt
    ? new Date(acta.f1SavedAt as string | number).toISOString()
    : undefined;
  return {
    data,
    status: asFormStatus(acta.f1FormStatus as string, data.noActa ? "guardado" : "nuevo"),
    savedAt: saved,
  };
}

function labelForRrhhTipo(t: string): string {
  if (t === "tecnico_interno") return "Técnico interno";
  if (t === "especialista_externo") return "Especialista externo";
  if (t === "supervisor") return "Supervisor";
  return t;
}

function labelForOtroTipo(t: string): string {
  const m: Record<string, string> = {
    comision: "Comisión",
    movilizacion: "Movilización",
    viatico: "Viático",
    alojamiento: "Alojamiento",
    varios: "Varios",
  };
  return m[t] ?? t;
}

/** Convierte fila evaluación → slot F2 */
export function mapDbEvaluacionToF2(ev: Record<string, unknown> | null): {
  data: F2Data;
  status: FormStatus;
  savedAt?: string;
} {
  if (!ev) {
    return { data: { ...F2_INITIAL }, status: "nuevo" };
  }
  const rrhhRaw = Array.isArray(ev.rrhh) ? ev.rrhh : [];
  const otrosRaw = Array.isArray(ev.otrosGastos) ? ev.otrosGastos : [];
  const rrhh = rrhhRaw.map((r: Record<string, unknown>) => ({
    ...r,
    label: typeof r.label === "string" ? r.label : labelForRrhhTipo(String(r.tipo ?? "")),
  })) as F2Data["rrhh"];
  const otrosGastos = otrosRaw.map((o: Record<string, unknown>) => ({
    ...o,
    label: typeof o.label === "string" ? o.label : labelForOtroTipo(String(o.tipo ?? "")),
  })) as F2Data["otrosGastos"];
  const data: F2Data = {
    ...F2_INITIAL,
    ...f2ScalarsFromDb(ev),
    hardware: Array.isArray(ev.hardware)
      ? normalizeFilasCosto(ev.hardware as F2Data["hardware"])
      : [],
    materiales: Array.isArray(ev.materiales)
      ? normalizeFilasCosto(ev.materiales as F2Data["materiales"])
      : [],
    rrhh,
    otrosGastos,
    firmaImagen: ev.firmaImagen ? String(ev.firmaImagen) : undefined,
  };
  const saved = ev.f2SavedAt
    ? new Date(ev.f2SavedAt as string | number).toISOString()
    : undefined;
  return {
    data,
    status: asFormStatus(ev.f2FormStatus as string, "nuevo"),
    savedAt: saved,
  };
}

export function mapDbResultadoToF3Slot(res: Record<string, unknown> | null): {
  status: FormStatus;
  payload?: F3Calculado;
} {
  if (!res) return { status: "nuevo" };
  const st = asFormStatus(res.f3FormStatus as string, "nuevo");
  const payload = res.payload && typeof res.payload === "object" ? (res.payload as F3Calculado) : undefined;
  return { status: st, payload };
}

export type ExpedienteResumenRow = {
  expediente: Record<string, unknown> & {
    id: number;
    nombre: string;
    creadorId: number;
  };
  acta: Record<string, unknown> | null;
  evaluacion: Record<string, unknown> | null;
  resultado: Record<string, unknown> | null;
};

/** Respuesta de `expediente.detalle` → Expediente */
/** Construye el payload de `evaluaciones.syncF2` desde F2Data (totales coherentes con F2Form). */
export function f2DataToEvalSyncData(d: F2Data): EvalSyncInput {
  const totalHardware = d.hardware.reduce((s, r) => s + r.total, 0);
  const totalMateriales = d.materiales.reduce((s, r) => s + r.total, 0);
  const totalRrhh = d.rrhh.reduce((s, r) => s + r.total, 0);
  const totalOtros = d.otrosGastos.reduce((s, r) => s + r.total, 0);
  const totalGastos = totalHardware + totalMateriales + totalRrhh + totalOtros;
  return {
    ...f2ScalarsToSync(d),
    hardware: d.hardware,
    materiales: d.materiales,
    rrhh: d.rrhh,
    otrosGastos: d.otrosGastos,
    totalHardware,
    totalMateriales,
    totalRrhh,
    totalOtros,
    totalGastos,
    status: "borrador",
    firmaImagen: d.firmaImagen,
  } as unknown as EvalSyncInput;
}

export function mapDetalleToExpediente(d: {
  expediente: ExpedienteResumenRow["expediente"];
  acta: Record<string, unknown> | null;
  evaluacion: Record<string, unknown> | null;
  resultado: Record<string, unknown> | null;
}): Expediente {
  return mapResumenRowToExpediente({
    expediente: d.expediente,
    acta: d.acta,
    evaluacion: d.evaluacion,
    resultado: d.resultado,
  });
}

export function mapResumenRowToExpediente(row: ExpedienteResumenRow): Expediente {
  const e = row.expediente;
  const f1 = mapDbActaToF1(row.acta);
  const f2 = mapDbEvaluacionToF2(row.evaluacion);
  const f3 = mapDbResultadoToF3Slot(row.resultado);
  const cAt = e.createdAt as Date | string | number | null | undefined;
  const uAt = e.updatedAt as Date | string | number | null | undefined;
  const createdAt = cAt ? new Date(cAt).toISOString() : new Date().toISOString();
  const updatedAt = uAt ? new Date(uAt).toISOString() : createdAt;
  return {
    id: e.id,
    nombre: e.nombre,
    creadorId: e.creadorId,
    status: "nuevo",
    createdAt,
    updatedAt,
    deletedAt: null,
    f1,
    f2,
    f3: { status: f3.status },
    // Número real de acta en BD — usado para generar VS-10001 en PDF e Historial
    serverNroActa: (row.acta as { nroActa?: number | null } | null)?.nroActa ?? null,
  };
}

/** Parte un string "fijo / móvil" en los campos TelefonoFijo y TelefonoMovil. */
function splitPhone(val: string, prefix = "representante"): Partial<F1Data> {
  const idx = val.indexOf(" / ");
  if (idx === -1) {
    return { [`${prefix}TelefonoFijo`]: val } as unknown as Partial<F1Data>;
  }
  return {
    [`${prefix}TelefonoFijo`]: val.slice(0, idx),
    [`${prefix}TelefonoMovil`]: val.slice(idx + 3),
  } as unknown as Partial<F1Data>;
}
