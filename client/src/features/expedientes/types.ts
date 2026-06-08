/**
 * features/expedientes/types.ts
 *
 * Tipos centralizados del módulo de Expedientes.
 * Cada expediente agrupa tres formularios (F1, F2, F3) con su propio estado.
 *
 * Para acoplar a los endpoints tRPC en el futuro:
 *   - F1Data  →  ActaInputSchema   (trpc.actas.create / update)
 *   - F2Data  →  EvaluacionInputSchema (trpc.evaluaciones.syncF2); escalares en F2_SYNC_SCALAR_KEYS (fromServer.ts)
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
  cuota?: 1 | 2 | 3 | 4; // Cuota a la que se imputa el gasto
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
  cuota?: 1 | 2 | 3 | 4; // Cuota a la que se imputa el gasto
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
  mes: 1 | 2 | 3 | 4;
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
  nombreFantasia: string;
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
  paisImplementacion: "", rut: "", nombreCliente: "", nombreFantasia: "",
  hardware: [], materiales: [], rrhh: [], otrosGastos: [],
  firmaImagen: undefined,
};

// ─── F3 — Resultados (calculado, sin data propia) ────────────────────────────

export interface ResumenMeses {
  mes1: number;
  mes2: number;
  mes3: number;
  mes4: number;
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

// ─── Motor de cálculo F3 (implementación en f3/calcularResultadoF3.ts) ───────

export type { CalcularResultadoF3Opciones } from "./f3/calcularResultadoF3";
export {
  calcularResultadoF3,
  FRACCION_GIM_DEFAULT,
  TASA_IMPUESTO_DEFAULT,
} from "./f3/calcularResultadoF3";

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
  /** N° de Acta consecutivo real (de BD, 6 dígitos, desde 1000) */
  nroActa?: number | null;
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
