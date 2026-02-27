/**
 * server/models/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Tipos de dominio del negocio (entidades principales).
 * Estos tipos son el contrato entre controllers y routes.
 *
 * NOTA: Los tipos de base de datos (Drizzle) viven en drizzle/schema.ts.
 * Aquí se definen los tipos de negocio que se usan en la lógica de la app.
 */

// ─── Acta (Formulario 1) ──────────────────────────────────────────────────────

export interface ActaModel {
  id?: number;
  userId: number;
  noActa?: string;
  atencion?: string;
  fecha?: Date;
  razonSocial?: string;
  nombreFantasia?: string;
  rucDniRut?: string;
  direccionComercial?: string;
  representanteLegal?: string;
  representanteEmail?: string;
  representanteFono?: string;
  contactoTecnico?: string;
  contactoTecnicoEmail?: string;
  contactoFacturacion?: string;
  contactoFacturacionEmail?: string;
  servicios?: ServicioContratadoModel[];
  formaPagoImplementacion?: FormaPagoModel;
  formaPagoMantencion?: FormaPagoModel;
  status?: "draft" | "completed" | "exported";
}

export interface ServicioContratadoModel {
  item: number;
  unidadNegocio: string;
  solucion: string;
  detalle: string;
  tipoVenta: string;
  valor: number;
  cantidad: number;
  total: number;
  plazo: string;
}

export interface FormaPagoModel {
  cuotas: number;
  monto: number;
  fechas: string[];
}

// ─── Evaluación de Proyecto - EP (Formulario 2) ───────────────────────────────

export interface EvaluacionModel {
  id?: number;
  userId: number;
  actaId?: number;
  unidadNegocio?: string;
  empresa?: string;
  solucion?: string;
  moneda?: string;
  montoProyecto?: number;
  plazo?: string;
  pais?: string;
  cliente?: string;
  hardware?: CostoItemModel[];
  materiales?: CostoItemModel[];
  rrhh?: RRHHModel;
  otrosGastos?: OtrosGastosModel;
  status?: "draft" | "completed" | "exported";
}

export interface CostoItemModel {
  centroCosto: string;
  descripcion: string;
  valorNeto: number;
  cantidad: number;
  totalNeto: number;
  iva: number;
  total: number;
}

export interface RRHHModel {
  tecnicoInterno: number;
  especialistaExterno: number;
  supervisor: number;
  total: number;
}

export interface OtrosGastosModel {
  comision: number;
  movilizacion: number;
  viatico: number;
  alojamiento: number;
  varios: number;
  total: number;
}

// ─── Resultado (Formulario 3 - calculado) ────────────────────────────────────

export interface ResultadoModel {
  evaluacionId: number;
  totalHardware: number;
  totalMateriales: number;
  totalRRHH: number;
  totalOtros: number;
  totalGastos: number;
  ingreso: number;
  resultado: number;
  distribucionGIM: number;   // 10%
  distribucionGP: number;    // 90%
  facturacionBruto: number;
  facturacionImpuesto: number; // 19%
  facturacionNeto: number;
  margenPorcentaje: number;
}

// ─── Usuario ──────────────────────────────────────────────────────────────────

export interface LocalUserModel {
  id?: number;
  username: string;
  role: "admin" | "user";
  isActive: boolean;
  createdAt?: Date;
}

export type UserRole = "admin" | "user";
