/**
 * useFormStore - Service Layer para gestión de estado de formularios.
 *
 * Arquitectura desacoplada: Los datos se almacenan actualmente en localStorage.
 * Para conectar con una base de datos SQL/NoSQL, reemplaza las funciones de
 * persistencia (saveToStorage / loadFromStorage) con llamadas tRPC.
 *
 * TODO: Conectar con API de Base de Datos aquí - reemplazar localStorage con tRPC mutations.
 */

import { useState, useEffect, useCallback } from "react";
import { nanoid } from "nanoid";
import { DISTRIBUCION_GIM, DISTRIBUCION_GP, TASA_IMPUESTO } from "../../../../shared/catalogs";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ServicioContratado {
  id: string;
  item: number;
  unidadNegocio: string;
  solucion: string;
  detalleServicio: string;
  tipoVenta: string;
  valorUnitario: number;
  cantidad: number;
  total: number;
  plazo: string;
}

export interface CuotaPago {
  monto: number;
  fecha: string;
}

export interface FormaPago {
  id: string;
  item: number;
  tipoVenta: string;
  nCuotas: number;
  primeraCuota: CuotaPago;
  segundaCuota: CuotaPago;
  terceraCuota: CuotaPago;
}

export interface ActaData {
  id?: number;
  noActa: string;
  atencion: string;
  fecha: string;
  razonSocial: string;
  nombreFantasia: string;
  rucDniRut: string;
  tipoDocumento: string;
  direccionComercial: string;
  representanteLegal: string;
  representanteDni: string;
  representanteEmail: string;
  representanteFono: string;
  contactoTecnico: string;
  contactoTecnicoEmail: string;
  contactoTecnicoFono: string;
  contactoFacturacion: string;
  contactoFacturacionEmail: string;
  contactoFacturacionFono: string;
  serviciosContratados: ServicioContratado[];
  formasPagoImplementacion: FormaPago[];
  formasPagoMantencion: FormaPago[];
  status: "borrador" | "completado" | "exportado";
  updatedAt?: string;
}

export interface FilaCosto {
  id: string;
  centroCosto: string;
  valorNeto: number;
  tipoMoneda: string;
  cantidad: number;
  totalNeto: number;
  iva: number;
  total: number;
  descripcionGasto: string;
  observacion: string;
}

export interface FilaRRHH {
  id: string;
  tipo: "tecnico_interno" | "especialista_externo" | "supervisor";
  label: string;
  centroCosto: string;
  valorSinImpuesto: number;
  tipoMoneda: string;
  cantidad: number;
  totalNeto: number;
  impuesto: number;
  total: number;
  descripcionGasto: string;
  observacion: string;
}

export interface FilaOtros {
  id: string;
  tipo: "comision" | "movilizacion" | "viatico" | "alojamiento" | "varios";
  label: string;
  centroCosto: string;
  valorNeto: number;
  tipoMoneda: string;
  cantidad: number;
  totalNeto: number;
  iva: number;
  total: number;
  descripcionGasto: string;
  observacion: string;
  mes: 1 | 2 | 3;
}

export interface EPData {
  id?: number;
  actaId?: number;
  unidadNegocios: string;
  empresa: string;
  solucion: string;
  tipoMoneda: string;
  montoProyecto: number;
  tipoCambio: number;
  totalClp: number;
  descripcion: string;
  preventa: string;
  fechaEntrega: string;
  ejecutivoComercial: string;
  plazoImplementacion: string;
  propuestaNumero: string;
  paisImplementacion: string;
  rut: string;
  nombreCliente: string;
  hardware: FilaCosto[];
  materiales: FilaCosto[];
  rrhh: FilaRRHH[];
  otrosGastos: FilaOtros[];
  status: "borrador" | "completado" | "exportado";
  updatedAt?: string;
}

// ─── Calculated Result (Formulario 3) ─────────────────────────────────────────

export interface ResultadoCalculado {
  // Resumen por categoría y mes
  resumen: {
    hardware: { mes1: number; mes2: number; mes3: number };
    materiales: { mes1: number; mes2: number; mes3: number };
    rh: { mes1: number; mes2: number; mes3: number };
    otros: { mes1: number; mes2: number; mes3: number };
    totalGastos: { mes1: number; mes2: number; mes3: number };
  };
  // Resultado evaluación
  nCuotas: number;
  ingreso: { mes1: number; mes2: number; mes3: number };
  gastos: { mes1: number; mes2: number; mes3: number };
  resultado: { mes1: number; mes2: number; mes3: number };
  distribucion: {
    gim: { porcentaje: number; mes1: number; mes2: number; mes3: number };
    gp: { porcentaje: number; mes1: number; mes2: number; mes3: number };
  };
  // Facturación inter-empresa
  facturacion: {
    bruto: { mes1: number; mes2: number; mes3: number };
    impuesto: { tasa: number; mes1: number; mes2: number; mes3: number };
    neto: { mes1: number; mes2: number; mes3: number };
  };
}

// ─── Calculation Engine ───────────────────────────────────────────────────────

/**
 * Motor de cálculo del Formulario 3.
 * Toma los datos del EP y calcula automáticamente el Resultado Evaluación.
 * Esta función es pura (sin efectos secundarios) para facilitar testing.
 */
export function calcularResultado(ep: EPData): ResultadoCalculado {
  // Calcular totales por mes para Otros gastos
  const otrosMes1 = ep.otrosGastos.filter(o => o.mes === 1).reduce((sum, o) => sum + o.total, 0);
  const otrosMes2 = ep.otrosGastos.filter(o => o.mes === 2).reduce((sum, o) => sum + o.total, 0);
  const otrosMes3 = ep.otrosGastos.filter(o => o.mes === 3).reduce((sum, o) => sum + o.total, 0);

  // Hardware y Materiales van al mes 1 por defecto
  const totalHardware = ep.hardware.reduce((sum, h) => sum + h.total, 0);
  const totalMateriales = ep.materiales.reduce((sum, m) => sum + m.total, 0);
  const totalRRHH = ep.rrhh.reduce((sum, r) => sum + r.total, 0);

  const gastosMes1 = totalHardware + totalMateriales + totalRRHH + otrosMes1;
  const gastosMes2 = otrosMes2;
  const gastosMes3 = otrosMes3;

  // Ingreso distribuido por cuotas (3 meses por defecto)
  const nCuotas = 3;
  const ingresoPorMes = ep.montoProyecto / nCuotas;

  const resultadoMes1 = ingresoPorMes - gastosMes1;
  const resultadoMes2 = ingresoPorMes - gastosMes2;
  const resultadoMes3 = ingresoPorMes - gastosMes3;

  // Distribución GIM (10%) y GP (90%)
  const gimMes1 = resultadoMes1 * DISTRIBUCION_GIM;
  const gimMes2 = resultadoMes2 * DISTRIBUCION_GIM;
  const gimMes3 = resultadoMes3 * DISTRIBUCION_GIM;
  const gpMes1 = resultadoMes1 * DISTRIBUCION_GP;
  const gpMes2 = resultadoMes2 * DISTRIBUCION_GP;
  const gpMes3 = resultadoMes3 * DISTRIBUCION_GP;

  // Facturación inter-empresa (sobre el resultado GP)
  const brutoMes1 = gpMes1;
  const brutoMes2 = gpMes2;
  const brutoMes3 = gpMes3;
  const impMes1 = brutoMes1 * TASA_IMPUESTO;
  const impMes2 = brutoMes2 * TASA_IMPUESTO;
  const impMes3 = brutoMes3 * TASA_IMPUESTO;

  return {
    resumen: {
      hardware: { mes1: totalHardware, mes2: 0, mes3: 0 },
      materiales: { mes1: totalMateriales, mes2: 0, mes3: 0 },
      rh: { mes1: totalRRHH, mes2: 0, mes3: 0 },
      otros: { mes1: otrosMes1, mes2: otrosMes2, mes3: otrosMes3 },
      totalGastos: { mes1: gastosMes1, mes2: gastosMes2, mes3: gastosMes3 },
    },
    nCuotas,
    ingreso: { mes1: ingresoPorMes, mes2: ingresoPorMes, mes3: ingresoPorMes },
    gastos: { mes1: gastosMes1, mes2: gastosMes2, mes3: gastosMes3 },
    resultado: { mes1: resultadoMes1, mes2: resultadoMes2, mes3: resultadoMes3 },
    distribucion: {
      gim: { porcentaje: DISTRIBUCION_GIM, mes1: gimMes1, mes2: gimMes2, mes3: gimMes3 },
      gp: { porcentaje: DISTRIBUCION_GP, mes1: gpMes1, mes2: gpMes2, mes3: gpMes3 },
    },
    facturacion: {
      bruto: { mes1: brutoMes1, mes2: brutoMes2, mes3: brutoMes3 },
      impuesto: { tasa: TASA_IMPUESTO, mes1: impMes1, mes2: impMes2, mes3: impMes3 },
      neto: { mes1: brutoMes1 - impMes1, mes2: brutoMes2 - impMes2, mes3: brutoMes3 - impMes3 },
    },
  };
}

// ─── Default values ───────────────────────────────────────────────────────────

export function createDefaultActa(): ActaData {
  return {
    noActa: "",
    atencion: "",
    fecha: new Date().toISOString().split("T")[0],
    razonSocial: "",
    nombreFantasia: "",
    rucDniRut: "",
    tipoDocumento: "RUT",
    direccionComercial: "",
    representanteLegal: "",
    representanteDni: "",
    representanteEmail: "",
    representanteFono: "",
    contactoTecnico: "",
    contactoTecnicoEmail: "",
    contactoTecnicoFono: "",
    contactoFacturacion: "",
    contactoFacturacionEmail: "",
    contactoFacturacionFono: "",
    serviciosContratados: [createDefaultServicio(1)],
    formasPagoImplementacion: [createDefaultFormaPago(1)],
    formasPagoMantencion: [createDefaultFormaPago(2)],
    status: "borrador",
  };
}

export function createDefaultServicio(item: number): ServicioContratado {
  return {
    id: nanoid(),
    item,
    unidadNegocio: "",
    solucion: "",
    detalleServicio: "",
    tipoVenta: "",
    valorUnitario: 0,
    cantidad: 1,
    total: 0,
    plazo: "",
  };
}

export function createDefaultFormaPago(item: number): FormaPago {
  return {
    id: nanoid(),
    item,
    tipoVenta: "",
    nCuotas: 3,
    primeraCuota: { monto: 0, fecha: "" },
    segundaCuota: { monto: 0, fecha: "" },
    terceraCuota: { monto: 0, fecha: "" },
  };
}

export function createDefaultEP(): EPData {
  return {
    unidadNegocios: "",
    empresa: "",
    solucion: "",
    tipoMoneda: "USD-DÓLAR",
    montoProyecto: 0,
    tipoCambio: 1,
    totalClp: 0,
    descripcion: "",
    preventa: "",
    fechaEntrega: "",
    ejecutivoComercial: "",
    plazoImplementacion: "",
    propuestaNumero: "",
    paisImplementacion: "",
    rut: "",
    nombreCliente: "",
    hardware: [createDefaultFilaCosto()],
    materiales: [createDefaultFilaCosto()],
    rrhh: [
      createDefaultFilaRRHH("tecnico_interno", "Técnico Interno"),
      createDefaultFilaRRHH("especialista_externo", "Especialista Externo"),
      createDefaultFilaRRHH("supervisor", "Supervisor"),
    ],
    otrosGastos: [
      createDefaultFilaOtros("comision", "Comisión", 1),
      createDefaultFilaOtros("movilizacion", "Movilización", 1),
      createDefaultFilaOtros("viatico", "Viático", 1),
      createDefaultFilaOtros("alojamiento", "Alojamiento", 1),
      createDefaultFilaOtros("varios", "Varios", 1),
    ],
    status: "borrador",
  };
}

export function createDefaultFilaCosto(): FilaCosto {
  return {
    id: nanoid(),
    centroCosto: "",
    valorNeto: 0,
    tipoMoneda: "USD-DÓLAR",
    cantidad: 1,
    totalNeto: 0,
    iva: 0,
    total: 0,
    descripcionGasto: "",
    observacion: "",
  };
}

export function createDefaultFilaRRHH(
  tipo: FilaRRHH["tipo"],
  label: string
): FilaRRHH {
  return {
    id: nanoid(),
    tipo,
    label,
    centroCosto: "",
    valorSinImpuesto: 0,
    tipoMoneda: "USD-DÓLAR",
    cantidad: 1,
    totalNeto: 0,
    impuesto: 0,
    total: 0,
    descripcionGasto: "",
    observacion: "",
  };
}

export function createDefaultFilaOtros(
  tipo: FilaOtros["tipo"],
  label: string,
  mes: 1 | 2 | 3
): FilaOtros {
  return {
    id: nanoid(),
    tipo,
    label,
    centroCosto: "",
    valorNeto: 0,
    tipoMoneda: "USD-DÓLAR",
    cantidad: 1,
    totalNeto: 0,
    iva: 0,
    total: 0,
    descripcionGasto: "",
    observacion: "",
    mes,
  };
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY_ACTA = "gestion_acta_draft";
const STORAGE_KEY_EP = "gestion_ep_draft";
const STORAGE_KEY_ACTAS_LIST = "gestion_actas_list";
const STORAGE_KEY_EP_LIST = "gestion_ep_list";

/**
 * Guarda el borrador del Acta en localStorage.
 * TODO: Conectar con API de Base de Datos aquí - reemplazar con trpc.actas.update.mutate()
 */
export function saveActaDraft(data: ActaData): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTA, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }));
  } catch (e) {
    console.warn("[Storage] Error saving Acta draft:", e);
  }
}

/**
 * Carga el borrador del Acta desde localStorage.
 * TODO: Conectar con API de Base de Datos aquí - reemplazar con trpc.actas.getById.query()
 */
export function loadActaDraft(): ActaData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTA);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("[Storage] Error loading Acta draft:", e);
    return null;
  }
}

/**
 * Guarda el borrador del EP en localStorage.
 * TODO: Conectar con API de Base de Datos aquí - reemplazar con trpc.evaluaciones.update.mutate()
 */
export function saveEPDraft(data: EPData): void {
  try {
    localStorage.setItem(STORAGE_KEY_EP, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }));
  } catch (e) {
    console.warn("[Storage] Error saving EP draft:", e);
  }
}

/**
 * Carga el borrador del EP desde localStorage.
 * TODO: Conectar con API de Base de Datos aquí - reemplazar con trpc.evaluaciones.getById.query()
 */
export function loadEPDraft(): EPData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EP);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("[Storage] Error loading EP draft:", e);
    return null;
  }
}

/**
 * Guarda una lista de actas en localStorage.
 * TODO: Conectar con API de Base de Datos aquí - reemplazar con trpc.actas.list.query()
 */
export function saveActasList(list: ActaData[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTAS_LIST, JSON.stringify(list));
  } catch (e) {
    console.warn("[Storage] Error saving Actas list:", e);
  }
}

export function loadActasList(): ActaData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTAS_LIST);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Guarda una lista de evaluaciones en localStorage.
 * TODO: Conectar con API de Base de Datos aquí - reemplazar con trpc.evaluaciones.list.query()
 */
export function saveEPList(list: EPData[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_EP_LIST, JSON.stringify(list));
  } catch (e) {
    console.warn("[Storage] Error saving EP list:", e);
  }
}

export function loadEPList(): EPData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EP_LIST);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// ─── Hook: useActaForm ─────────────────────────────────────────────────────────

export function useActaForm() {
  const [acta, setActa] = useState<ActaData>(() => loadActaDraft() ?? createDefaultActa());
  const [isDirty, setIsDirty] = useState(false);

  const updateActa = useCallback((updates: Partial<ActaData>) => {
    setActa(prev => {
      const next = { ...prev, ...updates };
      saveActaDraft(next);
      return next;
    });
    setIsDirty(true);
  }, []);

  const resetActa = useCallback(() => {
    const fresh = createDefaultActa();
    setActa(fresh);
    saveActaDraft(fresh);
    setIsDirty(false);
  }, []);

  const saveActa = useCallback(() => {
    const saved = { ...acta, status: "completado" as const, updatedAt: new Date().toISOString() };
    setActa(saved);
    saveActaDraft(saved);
    // Persist to list
    const list = loadActasList();
    const existingIdx = list.findIndex(a => a.noActa === saved.noActa && saved.noActa !== "");
    if (existingIdx >= 0) {
      list[existingIdx] = saved;
    } else {
      list.unshift(saved);
    }
    saveActasList(list);
    setIsDirty(false);
    return saved;
  }, [acta]);

  return { acta, updateActa, resetActa, saveActa, isDirty };
}

// ─── Hook: useEPForm ───────────────────────────────────────────────────────────

export function useEPForm() {
  const [ep, setEP] = useState<EPData>(() => loadEPDraft() ?? createDefaultEP());
  const [isDirty, setIsDirty] = useState(false);

  // Auto-calculate derived fields
  const updateEP = useCallback((updates: Partial<EPData>) => {
    setEP(prev => {
      const next = { ...prev, ...updates };
      // Auto-calculate totalClp
      if (updates.montoProyecto !== undefined || updates.tipoCambio !== undefined) {
        next.totalClp = next.montoProyecto * next.tipoCambio;
      }
      saveEPDraft(next);
      return next;
    });
    setIsDirty(true);
  }, []);

  const resetEP = useCallback(() => {
    const fresh = createDefaultEP();
    setEP(fresh);
    saveEPDraft(fresh);
    setIsDirty(false);
  }, []);

  const saveEP = useCallback(() => {
    const saved = { ...ep, status: "completado" as const, updatedAt: new Date().toISOString() };
    setEP(saved);
    saveEPDraft(saved);
    const list = loadEPList();
    const existingIdx = list.findIndex(e => e.propuestaNumero === saved.propuestaNumero && saved.propuestaNumero !== "");
    if (existingIdx >= 0) {
      list[existingIdx] = saved;
    } else {
      list.unshift(saved);
    }
    saveEPList(list);
    setIsDirty(false);
    return saved;
  }, [ep]);

  // Computed resultado (Formulario 3)
  const resultado = calcularResultado(ep);

  return { ep, updateEP, resetEP, saveEP, isDirty, resultado };
}

/**
 * Elimina un acta de la lista por su noActa o índice.
 * TODO: Conectar con API de Base de Datos aquí - reemplazar con trpc.actas.delete.mutate({ id })
 */
export function deleteActa(id: string): void {
  const list = loadActasList();
  // Try to match by noActa field or by index
  const filtered = list.filter((a, i) => a.noActa !== id && String(i) !== id);
  saveActasList(filtered);
}

/**
 * Elimina una evaluación de la lista por su propuestaNumero o índice.
 * TODO: Conectar con API de Base de Datos aquí - reemplazar con trpc.evaluaciones.delete.mutate({ id })
 */
export function deleteEP(id: string): void {
  const list = loadEPList();
  const filtered = list.filter((e, i) => e.propuestaNumero !== id && String(i) !== id);
  saveEPList(filtered);
}
