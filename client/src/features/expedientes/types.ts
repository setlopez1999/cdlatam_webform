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
  /** Si existe, la fila se sincroniza con el servicio del mismo id (monto / nCuotas). */
  linkedServicioId?: string;
  /** Último total del servicio usado para auto-sincronizar cuotas enlazadas. */
  linkedServicioTotal?: number;
  /** Precio unitario del servicio enlazado (Mantención: detectar cambio y resetear cuotas de gracia). */
  linkedServicioPrecioUnitario?: number;
  tipoVenta: string;
  nCuotas: number;
  cuotas: CuotaPago[]; // Arreglo dinámico de 1 a 4 cuotas
}

export interface HitoPago {
  id: string;
  nombreHito: string;
  precioHito: number;
  condicion: string;
}

export interface FormaPagoHitos {
  id: string;
  item: number;
  /** Si existe, la fila se sincroniza con el servicio del mismo id. */
  linkedServicioId?: string;
  tipoVenta: string;
  hitos: HitoPago[];
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
  formasPagoImplementacionHitos: FormaPagoHitos[];
  /** Suma de (valor unitario − monto cuota) en cuotas de gracia Mantención — persiste en expediente. */
  total_descuento_mantencion: number;
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
  serviciosContratados: [], formasPagoImplementacion: [], formasPagoMantencion: [], formasPagoImplementacionHitos: [],
  total_descuento_mantencion: 0,
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
  cuota?: 1 | 2 | 3; // Cuota a la que se imputa el gasto
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
  cuota?: 1 | 2 | 3; // Cuota a la que se imputa el gasto
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
  empresa: string; // Razón Social (se muestra como "Razón Social" en UI)
  centroCostoHeader: string; // Centro de Costo del encabezado (catálogo CECOs)
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
  unidadNegocios: "", empresa: "", centroCostoHeader: "", solucion: "", tipoMoneda: "",
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

/** Fracción por defecto del bloque GIM / Sres. sobre el resultado (10%). */
export const FRACCION_GIM_DEFAULT = 0.1;
/** Tasa de impuesto por defecto sobre la facturación bruta (19%). */
export const TASA_IMPUESTO_DEFAULT = 0.19;
const IMPUESTO_FRACCION_MIN = 0.005; // 0.5 %
const IMPUESTO_FRACCION_MAX = 1;

export interface CalcularResultadoF3Opciones {
  /** Entre 0 y 1. Por defecto 0.1 (10%). GP será 1 − fraccionGIM. */
  fraccionGIM?: number;
  /**
   * Fracción de impuesto sobre facturación bruta (tramo GP), ej. 0.19 = 19%.
   * Por defecto 19%. Rango efectivo 0.5 %–100 % (0.005–1).
   */
  tasaImpuesto?: number;
}

/**
 * Calcula el Resultado Evaluación (F3) a partir de los datos de F2.
 * Función pura — sin efectos secundarios, fácil de testear.
 */
export function calcularResultadoF3(
  f2: F2Data,
  f1?: F1Data,
  opciones?: CalcularResultadoF3Opciones,
): F3Calculado {
  let g = opciones?.fraccionGIM ?? FRACCION_GIM_DEFAULT;
  if (!Number.isFinite(g)) g = FRACCION_GIM_DEFAULT;
  g = Math.min(1, Math.max(0, g));
  const p = 1 - g;
  const hardware    = f2.hardware    ?? [];
  const materiales  = f2.materiales  ?? [];
  const rrhh        = f2.rrhh        ?? [];
  const otrosGastos = f2.otrosGastos ?? [];
  // F3-a: si se pasa f1, el ingreso viene SOLO de los servicios de implementación (excluye MANTENCIÓN)
  // El valor de mantención es recurrente y no forma parte del proyecto de implementación.
  const montoProyecto = f1
    ? (f1.serviciosContratados ?? [])
        .filter(sv => sv.tipoVenta?.toUpperCase() !== 'MANTENCIÓN')
        .reduce((s, sv) => s + (sv.total ?? 0), 0)
    : (f2.montoProyecto ?? 0);

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

  const gpMes1 = resMes1 * p;
  const gpMes2 = resMes2 * p;
  const gpMes3 = resMes3 * p;

  let tImp = opciones?.tasaImpuesto ?? TASA_IMPUESTO_DEFAULT;
  if (!Number.isFinite(tImp)) tImp = TASA_IMPUESTO_DEFAULT;
  tImp = Math.min(IMPUESTO_FRACCION_MAX, Math.max(IMPUESTO_FRACCION_MIN, tImp));

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
      gim: { porcentaje: g, mes1: resMes1 * g, mes2: resMes2 * g, mes3: resMes3 * g },
      gp:  { porcentaje: p, mes1: gpMes1, mes2: gpMes2, mes3: gpMes3 },
    },
    facturacion: {
      bruto:    { mes1: gpMes1,                          mes2: gpMes2,                          mes3: gpMes3                          },
      impuesto: { tasa: tImp, mes1: gpMes1 * tImp, mes2: gpMes2 * tImp, mes3: gpMes3 * tImp },
      neto:     { mes1: gpMes1 * (1 - tImp),   mes2: gpMes2 * (1 - tImp),   mes3: gpMes3 * (1 - tImp)   },
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
  /** Codigo compacto autogenerado del expediente (solo backend) */
  codigo?: string;
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
