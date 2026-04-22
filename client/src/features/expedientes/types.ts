/**
 * features/expedientes/types.ts
 *
 * Tipos centralizados del módulo de Expedientes.
 * Cada expediente agrupa tres formularios (F1, F2, F3) con su propio estado.
 *
 * Para acoplar a los endpoints tRPC en el futuro:
 *   - F1Data  →  ActaInputSchema   (trpc.actas.create / update)
 *   - F2Data  →  EvaluacionInputSchema (trpc.evaluaciones.create / update)
 *   - F3 es calculado automáticamente desde F2Data, sin endpoint propio
 */

// ─── Estado de formulario ─────────────────────────────────────────────────────

/**
 * nuevo       : El form se acaba de abrir por primera vez, sin ningún campo tocado.
 * sin_guardar : El usuario modificó al menos un campo pero no presionó Guardar.
 * guardado    : Se presionó Guardar y no hay cambios posteriores.
 *
 * Transición automática: guardado → sin_guardar al detectar cualquier cambio.
 */
export type FormStatus = "nuevo" | "sin_guardar" | "guardado";

// ─── Sub-tipos de F1 (Acta) ───────────────────────────────────────────────────

export interface ServicioContratado {
  id: string;
  unidadNegocio: string;
  solucion: string;
  detalleServicio: string;
  tipoVenta: string;
  moneda: string;
  cantidad: number;
  precioUnitario: number;
  plazo: string;
  total: number;
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

// ─── F1 — Acta ────────────────────────────────────────────────────────────────

export interface F1Data {
  // Encabezado
  sres: string;             // Empresa destinataria (catálogo)
  noActa: string;
  atencion: string;         // Persona de atención (catálogo)
  activacionNueva: string;
  fecha: string;
  // Empresa
  razonSocial: string;
  nombreFantasia: string;
  rucDniRut: string;
  tipoDocumento: string;
  direccionComercial: string;
  pais: string;             // Catálogo
  moneda: string;           // Catálogo
  // Contactos
  representanteLegal: string;
  representanteTipoDoc: string;      // Tipo de documento (obs. 6)
  representanteDni: string;          // Número de Identificación Fiscal (obs. 5)
  representanteEmail: string;
  representanteTelefonoFijo: string;  // Teléfono fijo (obs. 7)
  representanteTelefonoMovil: string; // Teléfono móvil (obs. 7)
  contactoTecnico: string;
  contactoTecnicoEmail: string;
  contactoTecnicoTelefonoFijo: string;
  contactoTecnicoTelefonoMovil: string;
  contactoFacturacion: string;
  contactoFacturacionEmail: string;
  contactoFacturacionTelefonoFijo: string;
  contactoFacturacionTelefonoMovil: string;
  // Servicios y pagos
  serviciosContratados: ServicioContratado[];
  formasPagoImplementacion: FormaPago[];
  formasPagoMantencion: FormaPago[];
  // Consideraciones y cláusulas
  consideracionesPersonalizadas: string[];  // ítems editables adicionales (obs. 11)
  clausulasLegales: string;                 // texto libre de cláusulas legales
  // Firma
  firmaImagen?: string;     // base64 data URL
}

export const F1_INITIAL: F1Data = {
  sres: "", noActa: "", atencion: "", activacionNueva: "", fecha: "",
  razonSocial: "", nombreFantasia: "", rucDniRut: "", tipoDocumento: "",
  direccionComercial: "", pais: "", moneda: "",
  representanteLegal: "", representanteTipoDoc: "", representanteDni: "", representanteEmail: "",
  representanteTelefonoFijo: "", representanteTelefonoMovil: "",
  contactoTecnico: "", contactoTecnicoEmail: "",
  contactoTecnicoTelefonoFijo: "", contactoTecnicoTelefonoMovil: "",
  contactoFacturacion: "", contactoFacturacionEmail: "",
  contactoFacturacionTelefonoFijo: "", contactoFacturacionTelefonoMovil: "",
  serviciosContratados: [], formasPagoImplementacion: [], formasPagoMantencion: [],
  consideracionesPersonalizadas: [], clausulasLegales: "",
  firmaImagen: undefined,
};

// ─── Sub-tipos de F2 (EP) ─────────────────────────────────────────────────────

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

// ─── F2 — Evaluación de Proyecto ─────────────────────────────────────────────

export interface F2Data {
  // Encabezado (puede pre-llenarse desde F1)
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
  // Costos
  hardware: FilaCosto[];
  materiales: FilaCosto[];
  rrhh: FilaRRHH[];
  otrosGastos: FilaOtros[];
  // Firma
  firmaImagen?: string;     // base64 data URL
}

export const F2_INITIAL: F2Data = {
  unidadNegocios: "", empresa: "", solucion: "", tipoMoneda: "",
  montoProyecto: 0, tipoCambio: 1, totalClp: 0,
  descripcion: "", preventa: "", fechaEntrega: "",
  ejecutivoComercial: "", plazoImplementacion: "", propuestaNumero: "",
  paisImplementacion: "", rut: "", nombreCliente: "",
  hardware: [], materiales: [], rrhh: [], otrosGastos: [],
  firmaImagen: undefined,
};

// ─── F3 — Resultados (calculado, sin data propia) ────────────────────────────

export interface ResumenMeses {
  mes1: number;
  mes2: number;
  mes3: number;
}

export interface F3Calculado {
  resumen: {
    hardware: ResumenMeses;
    materiales: ResumenMeses;
    rh: ResumenMeses;
    otros: ResumenMeses;
    totalGastos: ResumenMeses;
  };
  nCuotas: number;
  ingreso: ResumenMeses;
  gastos: ResumenMeses;
  resultado: ResumenMeses;
  distribucion: {
    gim: { porcentaje: number } & ResumenMeses;
    gp:  { porcentaje: number } & ResumenMeses;
  };
  facturacion: {
    bruto: ResumenMeses;
    impuesto: { tasa: number } & ResumenMeses;
    neto: ResumenMeses;
  };
}

// ─── ResultadoCalculado (alias para F3Calculado) ────────────────────────────

/** Alias de F3Calculado para compatibilidad con el motor de cálculo */
export type ResultadoCalculado = F3Calculado;

// ─── Motor de cálculo F3 ─────────────────────────────────────────────────────

const DISTRIBUCION_GIM = 0.1;   // 10%
const DISTRIBUCION_GP  = 0.9;   // 90%
const TASA_IMPUESTO    = 0.19;  // 19%

/**
 * Calcula el Resultado Evaluación (F3) a partir de los datos de F2.
 * Función pura — sin efectos secundarios, fácil de testear.
 */
export function calcularResultadoF3(f2: F2Data): F3Calculado {
  const hardware    = f2.hardware    ?? [];
  const materiales  = f2.materiales  ?? [];
  const rrhh        = f2.rrhh        ?? [];
  const otrosGastos = f2.otrosGastos ?? [];
  const montoProyecto = f2.montoProyecto ?? 0;

  const totalHardware   = hardware.reduce((s, r) => s + r.total, 0);
  const totalMateriales = materiales.reduce((s, r) => s + r.total, 0);
  const totalRRHH       = rrhh.reduce((s, r) => s + r.total, 0);
  const otrosMes1 = otrosGastos.filter(o => o.mes === 1).reduce((s, o) => s + o.total, 0);
  const otrosMes2 = otrosGastos.filter(o => o.mes === 2).reduce((s, o) => s + o.total, 0);
  const otrosMes3 = otrosGastos.filter(o => o.mes === 3).reduce((s, o) => s + o.total, 0);

  const gastosMes1 = totalHardware + totalMateriales + totalRRHH + otrosMes1;
  const gastosMes2 = otrosMes2;
  const gastosMes3 = otrosMes3;

  const nCuotas = 3;
  const ingresoPorMes = montoProyecto / nCuotas;

  const resMes1 = ingresoPorMes - gastosMes1;
  const resMes2 = ingresoPorMes - gastosMes2;
  const resMes3 = ingresoPorMes - gastosMes3;

  const gpMes1 = resMes1 * DISTRIBUCION_GP;
  const gpMes2 = resMes2 * DISTRIBUCION_GP;
  const gpMes3 = resMes3 * DISTRIBUCION_GP;

  return {
    resumen: {
      hardware:    { mes1: totalHardware,   mes2: 0,          mes3: 0          },
      materiales:  { mes1: totalMateriales, mes2: 0,          mes3: 0          },
      rh:          { mes1: totalRRHH,       mes2: 0,          mes3: 0          },
      otros:       { mes1: otrosMes1,       mes2: otrosMes2,  mes3: otrosMes3  },
      totalGastos: { mes1: gastosMes1,      mes2: gastosMes2, mes3: gastosMes3 },
    },
    nCuotas,
    ingreso:   { mes1: ingresoPorMes, mes2: ingresoPorMes, mes3: ingresoPorMes },
    gastos:    { mes1: gastosMes1,    mes2: gastosMes2,    mes3: gastosMes3    },
    resultado: { mes1: resMes1,       mes2: resMes2,       mes3: resMes3       },
    distribucion: {
      gim: { porcentaje: DISTRIBUCION_GIM, mes1: resMes1 * DISTRIBUCION_GIM, mes2: resMes2 * DISTRIBUCION_GIM, mes3: resMes3 * DISTRIBUCION_GIM },
      gp:  { porcentaje: DISTRIBUCION_GP,  mes1: gpMes1, mes2: gpMes2, mes3: gpMes3 },
    },
    facturacion: {
      bruto:    { mes1: gpMes1,                          mes2: gpMes2,                          mes3: gpMes3                          },
      impuesto: { tasa: TASA_IMPUESTO, mes1: gpMes1 * TASA_IMPUESTO, mes2: gpMes2 * TASA_IMPUESTO, mes3: gpMes3 * TASA_IMPUESTO },
      neto:     { mes1: gpMes1 * (1 - TASA_IMPUESTO),   mes2: gpMes2 * (1 - TASA_IMPUESTO),   mes3: gpMes3 * (1 - TASA_IMPUESTO)   },
    },
  };
}

// ─── Formulario con estado ────────────────────────────────────────────────────

export interface FormSlot<T> {
  data: T;
  status: FormStatus;
  /** ISO timestamp del último guardado (undefined si nunca se guardó) */
  savedAt?: string;
}

// ─── Expediente ───────────────────────────────────────────────────────────────

export interface Expediente {
  /** nanoid único — será el id en BD cuando se conecte */
  id: string;
  /** Nombre editable por el usuario */
  nombre: string;
  /** F1 — Acta */
  f1: FormSlot<F1Data>;
  /** F2 — Evaluación de Proyecto */
  f2: FormSlot<F2Data>;
  /** F3 — Resultados (solo estado, sin data: se calcula desde f2.data) */
  f3: { status: FormStatus };
  createdAt: string;
  updatedAt: string;
}
