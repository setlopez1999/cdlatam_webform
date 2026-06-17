/**
 * schema.pg.ts — Esquema Drizzle para PostgreSQL
 *
 * Equivalente exacto de schema.ts pero usando pgTable, serial, varchar, boolean, etc.
 * El servidor selecciona este schema cuando DATABASE_URL comienza con "postgres://" o "postgresql://".
 *
 * Convenciones de mapeo SQLite → PostgreSQL:
 *   integer PK autoIncrement  → serial
 *   integer (timestamp)       → timestamp (Date nativo)
 *   integer (0/1 boolean)     → integer (mantenemos compatibilidad con el código existente)
 *   text (json)               → text (json se guarda como text, igual que SQLite)
 *   real                      → doublePrecision
 */
import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  integer,
  doublePrecision,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── Roles del sistema ─────────────────────────────────────────────────────
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull().unique(),
  label: text("label").notNull(),
  descripcion: text("descripcion"),
  activo: integer("activo").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

// ─── Expedientes (debe ir antes de actas/evaluaciones por FK) ──────────────
export const expedientes = pgTable("expedientes", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  creadorId: integer("creadorId").notNull(),
  status: text("status").default("borrador").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: integer("deleted_at"),
});
export type Expediente = typeof expedientes.$inferSelect;
export type InsertExpediente = typeof expedientes.$inferInsert;

// ─── Actas (Formulario 1) ──────────────────────────────────────────────────
export const actas = pgTable("actas", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  expedienteId: integer("expedienteId").notNull().unique().references(() => expedientes.id),
  nroActa: integer("nro_acta").unique(),
  codigo: text("codigo").unique(),
  noActa: text("noActa"),
  atencion: text("atencion"),
  fecha: timestamp("fecha"),
  razonSocial: text("razonSocial"),
  nombreFantasia: text("nombreFantasia"),
  rucDniRut: text("rucDniRut"),
  direccionComercial: text("direccionComercial"),
  representanteLegal: text("representanteLegal"),
  representanteDni: text("representanteDni"),
  representanteEmail: text("representanteEmail"),
  representanteFono: text("representanteFono"),
  contactoTecnico: text("contactoTecnico"),
  contactoTecnicoEmail: text("contactoTecnicoEmail"),
  contactoTecnicoFono: text("contactoTecnicoFono"),
  contactoFacturacion: text("contactoFacturacion"),
  contactoFacturacionEmail: text("contactoFacturacionEmail"),
  contactoFacturacionFono: text("contactoFacturacionFono"),
  serviciosContratados: text("serviciosContratados"),
  formasPagoImplementacion: text("formasPagoImplementacion"),
  formasPagoMantencion: text("formasPagoMantencion"),
  status: text("status").default("borrador").notNull(),
  f1Datos: text("f1Datos"),
  f1FormStatus: text("f1FormStatus").default("nuevo").notNull(),
  f1SavedAt: timestamp("f1SavedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Acta = typeof actas.$inferSelect;
export type InsertActa = typeof actas.$inferInsert;

// ─── Evaluaciones de Proyecto (Formulario 2) ──────────────────────────────
export const evaluaciones = pgTable("evaluaciones", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  expedienteId: integer("expedienteId").notNull().unique().references(() => expedientes.id),
  unidadNegocios: text("unidadNegocios"),
  empresa: text("empresa"),
  centroCostoHeader: text("centroCostoHeader"),
  solucion: text("solucion"),
  tipoMoneda: text("tipoMoneda"),
  montoProyecto: doublePrecision("montoProyecto"),
  tipoCambio: doublePrecision("tipoCambio"),
  totalClp: doublePrecision("totalClp"),
  descripcion: text("descripcion"),
  preventa: text("preventa"),
  fechaEntrega: timestamp("fechaEntrega"),
  ejecutivoComercial: text("ejecutivoComercial"),
  plazoImplementacion: text("plazoImplementacion"),
  propuestaNumero: text("propuestaNumero"),
  paisImplementacion: text("paisImplementacion"),
  rut: text("rut"),
  nombreCliente: text("nombreCliente"),
  nombreFantasia: text("nombreFantasia"),
  hardware: text("hardware"),
  materiales: text("materiales"),
  rrhh: text("rrhh"),
  otrosGastos: text("otrosGastos"),
  totalHardware: doublePrecision("totalHardware"),
  totalMateriales: doublePrecision("totalMateriales"),
  totalRrhh: doublePrecision("totalRrhh"),
  totalOtros: doublePrecision("totalOtros"),
  totalGastos: doublePrecision("totalGastos"),
  firmaImagen: text("firmaImagen"),
  f2FormStatus: text("f2FormStatus").default("nuevo").notNull(),
  f2SavedAt: timestamp("f2SavedAt"),
  status: text("status").default("borrador").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Evaluacion = typeof evaluaciones.$inferSelect;
export type InsertEvaluacion = typeof evaluaciones.$inferInsert;

// ─── Usuarios del sistema ──────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  displayName: text("displayName"),
  role: text("role").default("user").notNull(),
  roleId: integer("roleId"),
  isActive: integer("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
/** @deprecated Usar User e InsertUser */
export type LocalUser = User;
/** @deprecated Usar User e InsertUser */
export type InsertLocalUser = InsertUser;

// ─── Relación N:N usuarios ↔ roles (RBAC) ─────────────────────────────────
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  roleId: integer("roleId").notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
});
export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = typeof userRoles.$inferInsert;

// ─── Gestor de Horarios ────────────────────────────────────────────────────
export const schEmpleados = pgTable("sch_empleados", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  apellido: text("apellido").notNull(),
  cargo: text("cargo"),
  activo: integer("activo").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type SchEmpleado = typeof schEmpleados.$inferSelect;
export type InsertSchEmpleado = typeof schEmpleados.$inferInsert;

export const schContratos = pgTable("sch_contratos", {
  id: serial("id").primaryKey(),
  empleadoId: integer("empleadoId").notNull(),
  fechaInicio: text("fechaInicio").notNull(),
  fechaFin: text("fechaFin"),
  horasDiarias: doublePrecision("horasDiarias").notNull(),
  diasSemana: text("diasSemana").notNull(),
  tipoDistribucion: text("tipoDistribucion").default("normal").notNull(),
  mismasHorasDiarias: integer("mismasHorasDiarias").default(1).notNull(),
  activo: integer("activo").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type SchContrato = typeof schContratos.$inferSelect;
export type InsertSchContrato = typeof schContratos.$inferInsert;

export const schBloquesHorario = pgTable("sch_bloques_horario", {
  id: serial("id").primaryKey(),
  contratoId: integer("contratoId").notNull(),
  diaSemana: integer("diaSemana").notNull(),
  horaInicio: text("horaInicio").notNull(),
  horaFin: text("horaFin").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SchBloqueHorario = typeof schBloquesHorario.$inferSelect;
export type InsertSchBloqueHorario = typeof schBloquesHorario.$inferInsert;

// ─── Interfaces JSON compartidas (idénticas al schema SQLite) ──────────────
export interface ServicioContratado {
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
  item: number;
  tipoVenta: string;
  nCuotas: number;
  primeraCuota: CuotaPago;
  segundaCuota: CuotaPago;
  terceraCuota: CuotaPago;
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

// ─── Catálogos del Sistema ─────────────────────────────────────────────────
export const catalogMonedas = pgTable("catalog_monedas", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogPaises = pgTable("catalog_paises", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogEmpresas = pgTable("catalog_empresas", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogDocumentoIdentidad = pgTable("catalog_documento_identidad", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogUnidadesNegocio = pgTable("catalog_unidades_negocio", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogSoluciones = pgTable("catalog_soluciones", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  unidadNegocioId: integer("unidadNegocioId").references(() => catalogUnidadesNegocio.id),
  activo: integer("activo").default(1).notNull(),
});

export const catalogDetalleServicio = pgTable("catalog_detalle_servicio", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  solucionId: integer("solucionId").references(() => catalogSoluciones.id),
  activo: integer("activo").default(1).notNull(),
});

export const catalogTipoVenta = pgTable("catalog_tipo_venta", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogPlazos = pgTable("catalog_plazos", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogDocumentos = pgTable("catalog_documentos", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogCecos = pgTable("catalog_cecos", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogDepartamentos = pgTable("catalog_departamentos", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogAreas = pgTable("catalog_areas", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogNombres = pgTable("catalog_nombres", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogConsideracionesComerciales = pgTable("catalog_consideraciones_comerciales", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull(),
  orden: integer("orden").default(0).notNull(),
  activo: integer("activo").default(1).notNull(),
  persistente: integer("persistente").default(0).notNull(),
});

export const catalogImplementacionItems = pgTable("catalog_implementacion_items", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  descripcion: text("descripcion").default("").notNull(),
  orden: integer("orden").default(0).notNull(),
  activo: integer("activo").default(1).notNull(),
});

// ─── Catálogos convertidos de dinámicos → fijos ────────────────────────────
export const catalogPreventas = pgTable("catalog_preventas", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogConceptosGasto = pgTable("catalog_conceptos_gasto", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogGerencias = pgTable("catalog_gerencias", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogSolicitantes = pgTable("catalog_solicitantes", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogFlujosAprobacion = pgTable("catalog_flujos_aprobacion", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogTiposGasto = pgTable("catalog_tipos_gasto", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogProyectos = pgTable("catalog_proyectos", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogTiposPago = pgTable("catalog_tipos_pago", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogEspecialistasExternos = pgTable("catalog_especialistas_externos", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogTecnicosInternos = pgTable("catalog_tecnicos_internos", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogNrosActa = pgTable("catalog_nros_acta", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogEjecutivosAtencion = pgTable("catalog_ejecutivos_atencion", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogSets = pgTable("catalog_sets", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

// ─── Metadatos de catálogos (fijos + dinámicos) ────────────────────────────
export const catalogMeta = pgTable("catalog_meta", {
  id: serial("id").primaryKey(),
  tableName: text("table_name").notNull().unique(),
  title: text("title").notNull(),
  isCustom: integer("is_custom").default(0).notNull(),
  linkedField: text("linked_field"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type CatalogMetaRow = typeof catalogMeta.$inferSelect;
export type InsertCatalogMeta = typeof catalogMeta.$inferInsert;

// Tipos de catálogo
export type CatalogMoneda = typeof catalogMonedas.$inferSelect;
export type CatalogPais = typeof catalogPaises.$inferSelect;
export type CatalogEmpresa = typeof catalogEmpresas.$inferSelect;
export type CatalogDocumentoIdentidad = typeof catalogDocumentoIdentidad.$inferSelect;
export type CatalogUnidadNegocio = typeof catalogUnidadesNegocio.$inferSelect;
export type CatalogSolucion = typeof catalogSoluciones.$inferSelect;
export type CatalogDetalleServicio = typeof catalogDetalleServicio.$inferSelect;
export type CatalogTipoVenta = typeof catalogTipoVenta.$inferSelect;
export type CatalogPlazo = typeof catalogPlazos.$inferSelect;
export type CatalogDocumento = typeof catalogDocumentos.$inferSelect;
export type CatalogCeco = typeof catalogCecos.$inferSelect;
export type CatalogDepartamento = typeof catalogDepartamentos.$inferSelect;
export type CatalogArea = typeof catalogAreas.$inferSelect;
export type CatalogNombre = typeof catalogNombres.$inferSelect;
export type CatalogConsideracionComercial = typeof catalogConsideracionesComerciales.$inferSelect;
export type CatalogImplementacionItem = typeof catalogImplementacionItems.$inferSelect;
export type CatalogPreventa = typeof catalogPreventas.$inferSelect;
export type CatalogConceptoGasto = typeof catalogConceptosGasto.$inferSelect;
export type CatalogGerencia = typeof catalogGerencias.$inferSelect;
export type CatalogSolicitante = typeof catalogSolicitantes.$inferSelect;
export type CatalogFlujoAprobacion = typeof catalogFlujosAprobacion.$inferSelect;
export type CatalogTipoGasto = typeof catalogTiposGasto.$inferSelect;
export type CatalogProyecto = typeof catalogProyectos.$inferSelect;
export type CatalogTipoPago = typeof catalogTiposPago.$inferSelect;
export type CatalogEspecialistaExterno = typeof catalogEspecialistasExternos.$inferSelect;
export type CatalogTecnicoInterno = typeof catalogTecnicosInternos.$inferSelect;
export type CatalogNroActa = typeof catalogNrosActa.$inferSelect;
export type CatalogEjecutivoAtencion = typeof catalogEjecutivosAtencion.$inferSelect;
export type CatalogSet = typeof catalogSets.$inferSelect;

// ─── Resultados F3 ─────────────────────────────────────────────────────────
export const resultadosExpediente = pgTable("resultados_expediente", {
  id: serial("id").primaryKey(),
  expedienteId: integer("expedienteId").notNull().unique().references(() => expedientes.id),
  payload: text("payload").notNull(),
  f3FormStatus: text("f3FormStatus").default("nuevo").notNull(),
  f3SavedAt: timestamp("f3SavedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type ResultadoExpediente = typeof resultadosExpediente.$inferSelect;
export type InsertResultadoExpediente = typeof resultadosExpediente.$inferInsert;

// ─── Implementaciones (checklist IPTV-OTT) ────────────────────────────────
export const implementaciones = pgTable(
  "implementaciones",
  {
    id: serial("id").primaryKey(),
    expedienteId: integer("expedienteId")
      .notNull()
      .references(() => expedientes.id, { onDelete: "cascade" }),
    checkKey: text("checkKey").notNull(),
    estado: integer("estado").notNull().default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("implementaciones_expedienteId_checkKey_unique").on(table.expedienteId, table.checkKey),
  ],
);
export type ImplementacionRow = typeof implementaciones.$inferSelect;
export type InsertImplementacion = typeof implementaciones.$inferInsert;

// ─── Audit Log ────────────────────────────────────────────────────────────
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  username: text("username").notNull(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entityId"),
  expedienteId: integer("expedienteId"),
  actaCodigo: text("actaCodigo"),
  changes: text("changes"),
  ip: text("ip"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

// ─── Catálogo de Cláusulas Legales (PDFs) ─────────────────────────────────
export const catalogClausulas = pgTable("catalog_clausulas", {
  id: serial("id").primaryKey(),
  valor: text("valor").notNull(),
  unidadNegocioId: integer("unidadNegocioId"),
  filePath: text("filePath").notNull(),
  fileName: text("fileName").notNull(),
  fileSize: integer("fileSize"),
  activo: integer("activo").default(1).notNull(),
  siempreIncluir: integer("siempre_incluir").default(0).notNull(),
  tipo: text("tipo").default("clausula").notNull(),
  ordenGlobal: integer("orden_global").default(50).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CatalogClausula = typeof catalogClausulas.$inferSelect;
export type InsertCatalogClausula = typeof catalogClausulas.$inferInsert;

/** Tipos válidos para el campo `tipo` de catalog_clausulas */
export type ClausulaTipo = 'clausula' | 'anexo_soporte';
