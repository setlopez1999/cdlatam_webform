import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  json,
} from "drizzle-orm/mysql-core";

// ─── Core user table ─────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Actas (Formulario 1) ─────────────────────────────────────────────────────
export const actas = mysqlTable("actas", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  // Encabezado
  noActa: varchar("noActa", { length: 50 }),
  atencion: varchar("atencion", { length: 255 }),
  fecha: timestamp("fecha"),

  // Datos Empresa
  razonSocial: varchar("razonSocial", { length: 255 }),
  nombreFantasia: varchar("nombreFantasia", { length: 255 }),
  rucDniRut: varchar("rucDniRut", { length: 50 }),
  direccionComercial: text("direccionComercial"),

  // Contacto Representante Legal
  representanteLegal: varchar("representanteLegal", { length: 255 }),
  representanteDni: varchar("representanteDni", { length: 50 }),
  representanteEmail: varchar("representanteEmail", { length: 320 }),
  representanteFono: varchar("representanteFono", { length: 50 }),

  // Contacto Técnico
  contactoTecnico: varchar("contactoTecnico", { length: 255 }),
  contactoTecnicoEmail: varchar("contactoTecnicoEmail", { length: 320 }),
  contactoTecnicoFono: varchar("contactoTecnicoFono", { length: 50 }),

  // Contacto Facturación
  contactoFacturacion: varchar("contactoFacturacion", { length: 255 }),
  contactoFacturacionEmail: varchar("contactoFacturacionEmail", { length: 320 }),
  contactoFacturacionFono: varchar("contactoFacturacionFono", { length: 50 }),

  // Servicios Contratados (JSON array)
  serviciosContratados: json("serviciosContratados"),

  // Formas de Pago (JSON arrays)
  formasPagoImplementacion: json("formasPagoImplementacion"),
  formasPagoMantencion: json("formasPagoMantencion"),

  // Estado
  status: mysqlEnum("status", ["borrador", "completado", "exportado"]).default("borrador").notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Acta = typeof actas.$inferSelect;
export type InsertActa = typeof actas.$inferInsert;

// ─── Evaluaciones de Proyecto (Formulario 2) ─────────────────────────────────
export const evaluaciones = mysqlTable("evaluaciones", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  actaId: int("actaId"), // Opcional: vinculación con Acta

  // Información General
  unidadNegocios: varchar("unidadNegocios", { length: 100 }),
  empresa: varchar("empresa", { length: 255 }),
  solucion: varchar("solucion", { length: 100 }),
  tipoMoneda: varchar("tipoMoneda", { length: 20 }),
  montoProyecto: decimal("montoProyecto", { precision: 15, scale: 2 }),
  tipoCambio: decimal("tipoCambio", { precision: 10, scale: 4 }),
  totalClp: decimal("totalClp", { precision: 15, scale: 2 }),
  descripcion: text("descripcion"),
  preventa: varchar("preventa", { length: 255 }),
  fechaEntrega: timestamp("fechaEntrega"),
  ejecutivoComercial: varchar("ejecutivoComercial", { length: 255 }),
  plazoImplementacion: varchar("plazoImplementacion", { length: 50 }),
  propuestaNumero: varchar("propuestaNumero", { length: 50 }),
  paisImplementacion: varchar("paisImplementacion", { length: 100 }),
  rut: varchar("rut", { length: 50 }),
  nombreCliente: varchar("nombreCliente", { length: 255 }),

  // Costos por categoría (JSON arrays con filas de la tabla)
  hardware: json("hardware"),
  materiales: json("materiales"),
  rrhh: json("rrhh"),
  otrosGastos: json("otrosGastos"),

  // Totales calculados
  totalHardware: decimal("totalHardware", { precision: 15, scale: 2 }),
  totalMateriales: decimal("totalMateriales", { precision: 15, scale: 2 }),
  totalRrhh: decimal("totalRrhh", { precision: 15, scale: 2 }),
  totalOtros: decimal("totalOtros", { precision: 15, scale: 2 }),
  totalGastos: decimal("totalGastos", { precision: 15, scale: 2 }),

  // Estado
  status: mysqlEnum("status", ["borrador", "completado", "exportado"]).default("borrador").notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Evaluacion = typeof evaluaciones.$inferSelect;
export type InsertEvaluacion = typeof evaluaciones.$inferInsert;

// ─── Usuarios locales (autenticación propia con username/password) ──────────────
export const localUsers = mysqlTable("localUsers", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  displayName: varchar("displayName", { length: 255 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isActive: int("isActive").default(1).notNull(), // 1 = activo, 0 = desactivado
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});

export type LocalUser = typeof localUsers.$inferSelect;
export type InsertLocalUser = typeof localUsers.$inferInsert;

// ─── Tipos compartidos para JSON fields ──────────────────────────────────────

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

// ─── Catálogos del Sistema (importados desde Excel Base de Datos) ─────────────

/** Monedas disponibles para transacciones */
export const catalogMonedas = mysqlTable("catalog_monedas", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 20 }).notNull().unique(), // USD, CLP, etc.
  nombre: varchar("nombre", { length: 100 }).notNull(),         // USD-DÓLAR
  activo: int("activo").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Países de operación */
export const catalogPaises = mysqlTable("catalog_paises", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 100 }).notNull().unique(),
  activo: int("activo").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Unidades de Negocio */
export const catalogUnidadesNegocio = mysqlTable("catalog_unidades_negocio", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 150 }).notNull().unique(),
  activo: int("activo").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Soluciones por Unidad de Negocio */
export const catalogSoluciones = mysqlTable("catalog_soluciones", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 200 }).notNull().unique(),
  activo: int("activo").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Detalle de Servicio */
export const catalogDetalleServicio = mysqlTable("catalog_detalle_servicio", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 200 }).notNull().unique(),
  activo: int("activo").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Tipos de Venta */
export const catalogTipoVenta = mysqlTable("catalog_tipo_venta", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 100 }).notNull().unique(),
  activo: int("activo").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Plazos de entrega / contrato */
export const catalogPlazos = mysqlTable("catalog_plazos", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 50 }).notNull().unique(),
  activo: int("activo").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Tipos de Documento de Identidad */
export const catalogDocumentos = mysqlTable("catalog_documentos", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 20 }).notNull().unique(), // RUC, RUT, DNI, CC
  activo: int("activo").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Centros de Costo (CECOs) — tabla principal con 61 registros del Excel */
export const catalogCecos = mysqlTable("catalog_cecos", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 10 }).notNull().unique(), // 20101
  empresa: varchar("empresa", { length: 20 }).notNull(),        // GN, TP, CD, GIM, IPTV
  departamento: varchar("departamento", { length: 200 }).notNull(), // Legal, Ventas, etc.
  nombreCompleto: varchar("nombreCompleto", { length: 300 }).notNull(), // "20101 GN Legal"
  activo: int("activo").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Contactos de referencia (personas) */
export const catalogContactos = mysqlTable("catalog_contactos", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  empresa: varchar("empresa", { length: 200 }),
  activo: int("activo").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CatalogMoneda = typeof catalogMonedas.$inferSelect;
export type CatalogPais = typeof catalogPaises.$inferSelect;
export type CatalogUnidadNegocio = typeof catalogUnidadesNegocio.$inferSelect;
export type CatalogSolucion = typeof catalogSoluciones.$inferSelect;
export type CatalogDetalleServicio = typeof catalogDetalleServicio.$inferSelect;
export type CatalogTipoVenta = typeof catalogTipoVenta.$inferSelect;
export type CatalogPlazo = typeof catalogPlazos.$inferSelect;
export type CatalogDocumento = typeof catalogDocumentos.$inferSelect;
export type CatalogCeco = typeof catalogCecos.$inferSelect;
export type CatalogContacto = typeof catalogContactos.$inferSelect;
