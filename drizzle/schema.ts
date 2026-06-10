import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
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
  // Vínculo con el expediente (FK numérica)
  expedienteId: integer("expedienteId").notNull().unique().references(() => expedientes.id),
  /** N° de Acta consecutivo (6 dígitos, desde 1) */
  nroActa: integer("nro_acta").unique(),
  /** Codigo compacto autogenerado del documento F1 (solo backend). */
  codigo: text("codigo").unique(),

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

  // Estado workflow (borrador / completado / exportado)
  status: text("status").default("borrador").notNull(),

  /** Snapshot JSON completo de F1 (F1Data) */
  f1Datos: text("f1Datos", { mode: "json" }),
  /** Estado UI del slot F1: nuevo | sin_guardar | guardado */
  f1FormStatus: text("f1FormStatus").default("nuevo").notNull(),
  f1SavedAt: integer("f1SavedAt", { mode: "timestamp" }),

  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export type Acta = typeof actas.$inferSelect;
export type InsertActa = typeof actas.$inferInsert;

// ─── Evaluaciones de Proyecto (Formulario 2) ─────────────────────────────────
export const evaluaciones = sqliteTable("evaluaciones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  /** Vínculo con el expediente (FK numérica) */
  expedienteId: integer("expedienteId").notNull().unique().references(() => expedientes.id),

  // Información General
  unidadNegocios: text("unidadNegocios"),
  empresa: text("empresa"),
  /** Centro de costo del encabezado F2 (catálogo CECOs). */
  centroCostoHeader: text("centroCostoHeader"),
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
  nombreFantasia: text("nombreFantasia"),

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

  firmaImagen: text("firmaImagen"),

  /** Estado UI del slot F2 */
  f2FormStatus: text("f2FormStatus").default("nuevo").notNull(),
  f2SavedAt: integer("f2SavedAt", { mode: "timestamp" }),

  // Estado workflow EP
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
  unidadNegocioId: integer("unidadNegocioId").references(() => catalogUnidadesNegocio.id),
  activo: integer("activo").default(1).notNull(),
});

export const catalogDetalleServicio = sqliteTable("catalog_detalle_servicio", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  valor: text("valor").notNull().unique(),
  solucionId: integer("solucionId").references(() => catalogSoluciones.id), // FK a catalog_soluciones
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

/** Plantillas para la sección Consideraciones del Acta (F1); ordenadas por `orden`. */
export const catalogConsideracionesComerciales = sqliteTable("catalog_consideraciones_comerciales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  valor: text("valor").notNull(),
  orden: integer("orden").default(0).notNull(),
  activo: integer("activo").default(1).notNull(),
  /** 1 = siempre marcado y no desmarcable por usuarios con rol comercial */
  persistente: integer("persistente").default(0).notNull(),
});

/** Maestro de ítems del checklist Implementación IPTV-OTT (`implementaciones.checkKey` → `key`). */
export const catalogImplementacionItems = sqliteTable("catalog_implementacion_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  orden: integer("orden").default(0).notNull(),
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
export type CatalogConsideracionComercial = typeof catalogConsideracionesComerciales.$inferSelect;
export type CatalogImplementacionItem = typeof catalogImplementacionItems.$inferSelect;
// ─── Expedientes (contenedor de actas y evaluaciones) ────────────────────────
/**
 * Tabla expedientes — metadata del expediente.
 * Único identificador: id (autoincremental PK).
 * Cada expediente tiene exactamente un acta (F1), una evaluación (F2)
 * y un resultado (F3), vinculados por expedienteId.
 */
export const expedientes = sqliteTable("expedientes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  creadorId: integer("creadorId").notNull(),       // FK blanda → users.id
  status: text("status").default("borrador").notNull(), // "borrador" | "en_proceso" | "completado"
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  /** Timestamp Unix de borrado suave (NULL = activo, valor = en papelera). */
  deletedAt: integer("deleted_at"),
});

export type Expediente = typeof expedientes.$inferSelect;
export type InsertExpediente = typeof expedientes.$inferInsert;

/** Resultados F3 persistidos por expediente (snapshot + estado UI) */
export const resultadosExpediente = sqliteTable("resultados_expediente", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  expedienteId: integer("expedienteId").notNull().unique().references(() => expedientes.id),
  /** JSON: salida de calcularResultadoF3 u objeto extendido */
  payload: text("payload", { mode: "json" }).notNull(),
  f3FormStatus: text("f3FormStatus").default("nuevo").notNull(),
  f3SavedAt: integer("f3SavedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export type ResultadoExpediente = typeof resultadosExpediente.$inferSelect;
export type InsertResultadoExpediente = typeof resultadosExpediente.$inferInsert;

/** Items del checklist de Implementación IPTV-OTT por expediente (FK expedientes.id). */
export const implementaciones = sqliteTable(
  "implementaciones",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    expedienteId: integer("expedienteId")
      .notNull()
      .references(() => expedientes.id, { onDelete: "cascade" }),
    /** Clave estable; debe existir en `catalog_implementacion_items.key`. */
    checkKey: text("checkKey").notNull(),
    /** 0 = no, 1 = sí */
    estado: integer("estado").notNull().default(0),
    createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
  },
  table => [
    uniqueIndex("implementaciones_expedienteId_checkKey_unique").on(table.expedienteId, table.checkKey),
  ],
);

export type ImplementacionRow = typeof implementaciones.$inferSelect;
export type InsertImplementacion = typeof implementaciones.$inferInsert;

// ─── Audit Log — trazabilidad de acciones ────────────────────────────────────
/**
 * Tabla audit_log — registra toda actividad relevante del sistema.
 * Se graba desde el momento del despliegue. Sin retención automática por ahora.
 *
 * action: LOGIN, LOGOUT, LOGIN_FAILED, CREATE, UPDATE, DELETE, UPLOAD, …
 * entity: expediente, acta, auth, catalog_clausulas, …
 * changes: JSON { before, after } u otro resumen
 */
export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId"),                       // null si sesión expirada o intento fallido
  username: text("username").notNull(),            // copia del username al momento de la acción
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entityId"),                   // null p. ej. LOGIN
  expedienteId: integer("expedienteId"),         // denormalizado para filtros / UI
  expedienteCodigo: text("expedienteCodigo"),
  changes: text("changes", { mode: "json" }),      // { before, after } o null
  ip: text("ip"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

// ─── Catálogo de Cláusulas Legales (PDFs) ────────────────────────────────
// Relacionado con Unidades de Negocio (catalog_unidades_negocio)
export const catalogClausulas = sqliteTable("catalog_clausulas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  valor: text("valor").notNull(),               // nombre de la cláusula
  unidadNegocioId: integer("unidadNegocioId"),    // FK a catalog_unidades_negocio
  filePath: text("filePath").notNull(),         // ruta relativa al archivo PDF
  fileName: text("fileName").notNull(),        // nombre original del archivo
  fileSize: integer("fileSize"),               // tamaño en bytes
  activo: integer("activo").default(1).notNull(),
  siempreIncluir: integer("siempre_incluir").default(0).notNull(), // si=1 se adjunta siempre al Acta
  /**
   * tipo: clasifica el documento para el ensamblado del PDF final.
   *   'clausula'      → cláusula legal según unidad de negocio
   *   'features'      → PDF estático de especificaciones (siempre va, posición 2)
   *   'anexo_soporte' → Nexo de soporte (siempre va, posición final)
   */
  tipo: text("tipo").default("clausula").notNull(),
  /**
   * orden_global: número que define el orden de aparición en el PDF final.
   * El Acta siempre es posición 0 (generada aparte).
   * Editable desde la UI de Cláusulas Legales.
   * Convención inicial: features=10, clausulas=20-29, anexo_soporte=99
   */
  ordenGlobal: integer("orden_global").default(50).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});

export type CatalogClausula = typeof catalogClausulas.$inferSelect;
export type InsertCatalogClausula = typeof catalogClausulas.$inferInsert;

/** Tipos válidos para el campo `tipo` de catalog_clausulas */
export type ClausulaTipo = 'clausula' | 'features' | 'anexo_soporte';
