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

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO: GESTOR DE HORARIOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * sch_empleados — Empleados registrados en el sistema de horarios.
 * Son entidades independientes de los users de la app.
 */
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

/**
 * sch_contratos — Rango de trabajo de un empleado.
 * Un empleado puede tener varios contratos históricos.
 *
 * diasSemana: JSON array de números [1,2,3,4,5] (1=lun...7=dom)
 *   - "normal"      → [1,2,3,4,5]
 *   - "lunes_sabado" → [1,2,3,4,5,6]
 *   - "personalizado" → cualquier combinación
 *
 * mismasHorasDiarias: 1 = todos los días tienen el mismo bloque
 *                      0 = cada día puede tener bloques distintos
 */
export const schContratos = sqliteTable("sch_contratos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  empleadoId: integer("empleadoId").notNull(),
  fechaInicio: text("fechaInicio").notNull(),      // "YYYY-MM-DD"
  fechaFin: text("fechaFin"),                       // null = indefinido
  horasDiarias: real("horasDiarias").notNull(),
  diasSemana: text("diasSemana", { mode: "json" }).notNull(), // number[]
  tipoDistribucion: text("tipoDistribucion").default("normal").notNull(), // "normal" | "lunes_sabado" | "personalizado"
  mismasHorasDiarias: integer("mismasHorasDiarias").default(1).notNull(), // 0 | 1
  activo: integer("activo").default(1).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export type SchContrato = typeof schContratos.$inferSelect;
export type InsertSchContrato = typeof schContratos.$inferInsert;

/**
 * sch_bloques_horario — Distribución de horas por día dentro de un contrato.
 *
 * diaSemana: 1=lunes, 2=martes, 3=miércoles, 4=jueves, 5=viernes, 6=sábado, 7=domingo
 * horaInicio / horaFin: "HH:MM" en formato 24h
 *
 * Si mismasHorasDiarias=1 → se crea un bloque con diaSemana=0 (aplica a todos los días)
 * Si mismasHorasDiarias=0 → un bloque por cada día configurado
 */
export const schBloquesHorario = sqliteTable("sch_bloques_horario", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contratoId: integer("contratoId").notNull(),
  diaSemana: integer("diaSemana").notNull(), // 0=todos, 1=lun...7=dom
  horaInicio: text("horaInicio").notNull(),  // "08:00"
  horaFin: text("horaFin").notNull(),        // "17:00"
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