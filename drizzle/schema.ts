import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";

// ─── Roles del sistema ───────────────────────────────────────────────────────
export const roles = sqliteTable("roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull().unique(),
  label: text("label").notNull(),
  descripcion: text("descripcion"),
  activo: integer("activo").default(1).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

// ─── Actas (Formulario 1) ─────────────────────────────────────────────────────
export const actas = sqliteTable("actas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  // Vínculo con el expediente de Zustand (nanoid del store)
  expedienteUuid: text("expedienteUuid"),

  // Encabezado
  noActa: text("noActa"),
  atencion: text("atencion"),
  fecha: integer("fecha", { mode: "timestamp" }),

  // Datos Empresa
  razonSocial: text("razonSocial"),
  nombreFantasia: text("nombreFantasia"),
  rucDniRut: text("rucDniRut"),
  direccionComercial: text("direccionComercial"),

  // Contacto Representante Legal
  representanteLegal: text("representanteLegal"),
  representanteDni: text("representanteDni"),
  representanteEmail: text("representanteEmail"),
  representanteFono: text("representanteFono"),

  // Contacto Técnico
  contactoTecnico: text("contactoTecnico"),
  contactoTecnicoEmail: text("contactoTecnicoEmail"),
  contactoTecnicoFono: text("contactoTecnicoFono"),

  // Contacto Facturación
  contactoFacturacion: text("contactoFacturacion"),
  contactoFacturacionEmail: text("contactoFacturacionEmail"),
  contactoFacturacionFono: text("contactoFacturacionFono"),

  // Servicios Contratados (JSON se guarda como texto)
  serviciosContratados: text("serviciosContratados", { mode: "json" }),

  // Formas de Pago
  formasPagoImplementacion: text("formasPagoImplementacion", { mode: "json" }),
  formasPagoMantencion: text("formasPagoMantencion", { mode: "json" }),

  // Estado
  status: text("status").default("borrador").notNull(),

  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export type Acta = typeof actas.$inferSelect;
export type InsertActa = typeof actas.$inferInsert;

// ─── Evaluaciones de Proyecto (Formulario 2) ─────────────────────────────────
export const evaluaciones = sqliteTable("evaluaciones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  actaId: integer("actaId"),

  // Información General
  unidadNegocios: text("unidadNegocios"),
  empresa: text("empresa"),
  solucion: text("solucion"),
  tipoMoneda: text("tipoMoneda"),
  montoProyecto: real("montoProyecto"),
  tipoCambio: real("tipoCambio"),
  totalClp: real("totalClp"),
  descripcion: text("descripcion"),
  preventa: text("preventa"),
  fechaEntrega: integer("fechaEntrega", { mode: "timestamp" }),
  ejecutivoComercial: text("ejecutivoComercial"),
  plazoImplementacion: text("plazoImplementacion"),
  propuestaNumero: text("propuestaNumero"),
  paisImplementacion: text("paisImplementacion"),
  rut: text("rut"),
  nombreCliente: text("nombreCliente"),

  // Costos por categoría (JSON)
  hardware: text("hardware", { mode: "json" }),
  materiales: text("materiales", { mode: "json" }),
  rrhh: text("rrhh", { mode: "json" }),
  otrosGastos: text("otrosGastos", { mode: "json" }),

  // Totales calculados
  totalHardware: real("totalHardware"),
  totalMateriales: real("totalMateriales"),
  totalRrhh: real("totalRrhh"),
  totalOtros: real("totalOtros"),
  totalGastos: real("totalGastos"),

  // Estado
  status: text("status").default("borrador").notNull(),

  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export type Evaluacion = typeof evaluaciones.$inferSelect;
export type InsertEvaluacion = typeof evaluaciones.$inferInsert;

// ─── Usuarios del sistema ────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  displayName: text("displayName"),
  role: text("role").default("user").notNull(),   // fallback string
  roleId: integer("roleId"),                       // FK blanda a roles.id
  isActive: integer("isActive").default(1).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
/** @deprecated Usar User e InsertUser */
export type LocalUser = User;
/** @deprecated Usar User e InsertUser */
export type InsertLocalUser = InsertUser;

// ─── Relación N:N usuarios ↔ roles (RBAC) ────────────────────────────────────────────
export const userRoles = sqliteTable("user_roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  roleId: integer("roleId").notNull(),
  assignedAt: integer("assignedAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = typeof userRoles.$inferInsert;

// --- MODULO: GESTOR DE HORARIOS ---

export const schEmpleados = sqliteTable("sch_empleados", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  apellido: text("apellido").notNull(),
  cargo: text("cargo"),
  activo: integer("activo").default(1).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export type SchEmpleado = typeof schEmpleados.$inferSelect;
export type InsertSchEmpleado = typeof schEmpleados.$inferInsert;

export const schContratos = sqliteTable("sch_contratos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  empleadoId: integer("empleadoId").notNull(),
  fechaInicio: text("fechaInicio").notNull(),
  fechaFin: text("fechaFin"),
  horasDiarias: real("horasDiarias").notNull(),
  diasSemana: text("diasSemana", { mode: "json" }).notNull(),
  tipoDistribucion: text("tipoDistribucion").default("normal").notNull(),
  mismasHorasDiarias: integer("mismasHorasDiarias").default(1).notNull(),
  activo: integer("activo").default(1).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export type SchContrato = typeof schContratos.$inferSelect;
export type InsertSchContrato = typeof schContratos.$inferInsert;

export const schBloquesHorario = sqliteTable("sch_bloques_horario", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contratoId: integer("contratoId").notNull(),
  diaSemana: integer("diaSemana").notNull(),
  horaInicio: text("horaInicio").notNull(),
  horaFin: text("horaFin").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export type SchBloqueHorario = typeof schBloquesHorario.$inferSelect;
export type InsertSchBloqueHorario = typeof schBloquesHorario.$inferInsert;

// ─── Tipos compartidos para JSON fields (¡Estas eran las que faltaban!) ──────

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

// ─── Catálogos del Sistema ──────────────────────────────────────────────────

export const catalogMonedas = sqliteTable("catalog_monedas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogPaises = sqliteTable("catalog_paises", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogEmpresas = sqliteTable("catalog_empresas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogDocumentoIdentidad = sqliteTable("catalog_documento_identidad", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogUnidadesNegocio = sqliteTable("catalog_unidades_negocio", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogSoluciones = sqliteTable("catalog_soluciones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogDetalleServicio = sqliteTable("catalog_detalle_servicio", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogTipoVenta = sqliteTable("catalog_tipo_venta", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogPlazos = sqliteTable("catalog_plazos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogDocumentos = sqliteTable("catalog_documentos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogCecos = sqliteTable("catalog_cecos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogDepartamentos = sqliteTable("catalog_departamentos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogAreas = sqliteTable("catalog_areas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  valor: text("valor").notNull().unique(),
  activo: integer("activo").default(1).notNull(),
});

export const catalogNombres = sqliteTable("catalog_nombres", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  valor: text("valor").notNull(),
  activo: integer("activo").default(1).notNull(),
});

// ─── Metadatos de catálogos (fijos + dinámicos) ─────────────────────────────
export const catalogMeta = sqliteTable("catalog_meta", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tableName: text("table_name").notNull().unique(),
  title: text("title").notNull(),
  isCustom: integer("is_custom").default(0).notNull(),
  linkedField: text("linked_field"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
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
// ─── Expedientes (contenedor de actas y evaluaciones) ────────────────────────
/**
 * Tabla expedientes — metadata del expediente.
 * Los datos de formulario (F1, F2) siguen en localStorage via Zustand
 * hasta que se complete la migración de campos (ver docs/ARQUITECTURA_EXPEDIENTES_INTEGRIDAD.md).
 *
 * Relaciones:
 *   creadorId → users.id   (quién creó el expediente)
 *   actaId    → actas.id   (FK blanda, null hasta que F1 se guarde en BD)
 *   evaluacionId → evaluaciones.id (FK blanda, null hasta que F2 se guarde en BD)
 */
export const expedientes = sqliteTable("expedientes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  uuid: text("uuid").notNull().unique(),          // nanoid del store de Zustand
  nombre: text("nombre").notNull(),
  creadorId: integer("creadorId").notNull(),       // FK blanda → users.id
  actaId: integer("actaId"),                       // FK blanda → actas.id (futuro)
  evaluacionId: integer("evaluacionId"),           // FK blanda → evaluaciones.id (futuro)
  status: text("status").default("borrador").notNull(), // "borrador" | "en_proceso" | "completado"
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export type Expediente = typeof expedientes.$inferSelect;
export type InsertExpediente = typeof expedientes.$inferInsert;

// ─── Audit Log — trazabilidad de acciones ────────────────────────────────────
/**
 * Tabla audit_log — registra toda actividad relevante del sistema.
 * Se graba desde el momento del despliegue. Sin retención automática por ahora.
 *
 * action: "LOGIN" | "LOGOUT" | "CREATE" | "UPDATE" | "DELETE"
 * entity: "expediente" | "acta" | "evaluacion" | "user" | "implementacion"
 * changes: JSON { before: {...}, after: {...} } — solo en UPDATE
 */
export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId"),                       // null si sesión expirada
  username: text("username").notNull(),            // copia del username al momento de la acción
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entityId"),                   // null para LOGIN/LOGOUT
  changes: text("changes", { mode: "json" }),      // { before, after } o null
  ip: text("ip"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;
