/**
 * DDL idempotente para todas las tablas **fijas** del proyecto (SQLite).
 *
 * Fuente de verdad del modelo de datos: [`drizzle/schema.ts`](../drizzle/schema.ts).
 * Este archivo debe actualizarse cuando se añadan tablas o columnas nuevas en el schema,
 * y documentarse el cambio en [`docs/DATABASE_SCHEMA.md`](../docs/DATABASE_SCHEMA.md).
 *
 * Se ejecuta con CREATE TABLE IF NOT EXISTS tras migrate() y también como fallback
 * si Drizzle migrate falla — garantiza que ningún arranque deje la BD incompleta.
 *
 * Tablas dinámicas `catalog_custom_*` no se crean aquí (se generan en runtime).
 */

/** Todas las sentencias CREATE en orden seguro (FK desactivadas por defecto en SQLite). */
export const BOOTSTRAP_ALL_PROJECT_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  nombre TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  descripcion TEXT,
  activo INTEGER DEFAULT 1 NOT NULL,
  createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  updatedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  displayName TEXT,
  role TEXT DEFAULT 'user' NOT NULL,
  roleId INTEGER,
  isActive INTEGER DEFAULT 1 NOT NULL,
  createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  updatedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  lastSignedIn INTEGER
);

CREATE TABLE IF NOT EXISTS user_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  userId INTEGER NOT NULL,
  roleId INTEGER NOT NULL,
  assignedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  UNIQUE(userId, roleId)
);

CREATE TABLE IF NOT EXISTS catalog_meta (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  table_name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  is_custom INTEGER DEFAULT 0 NOT NULL,
  linked_field TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog_monedas (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_paises (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_empresas (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  logoBase64 TEXT,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_documento_identidad (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_unidades_negocio (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_soluciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  unidadNegocioId INTEGER,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_detalle_servicio (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  solucionId INTEGER,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_tipo_venta (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_plazos (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_documentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_cecos (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_departamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_nombres (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL,
  activo INTEGER DEFAULT 1 NOT NULL
);

CREATE TABLE IF NOT EXISTS actas (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  userId INTEGER NOT NULL,
  expedienteId INTEGER NOT NULL UNIQUE REFERENCES expedientes(id),
  nro_acta INTEGER UNIQUE,
  codigo TEXT UNIQUE,
  noActa TEXT,
  atencion TEXT,
  fecha INTEGER,
  razonSocial TEXT,
  nombreFantasia TEXT,
  rucDniRut TEXT,
  direccionComercial TEXT,
  representanteLegal TEXT,
  representanteDni TEXT,
  representanteEmail TEXT,
  representanteFono TEXT,
  contactoTecnico TEXT,
  contactoTecnicoEmail TEXT,
  contactoTecnicoFono TEXT,
  contactoFacturacion TEXT,
  contactoFacturacionEmail TEXT,
  contactoFacturacionFono TEXT,
  serviciosContratados TEXT,
  formasPagoImplementacion TEXT,
  formasPagoMantencion TEXT,
  status TEXT DEFAULT 'borrador' NOT NULL,
  f1Datos TEXT,
  f1FormStatus TEXT DEFAULT 'nuevo' NOT NULL,
  f1SavedAt INTEGER,
  createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  updatedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
);

CREATE TABLE IF NOT EXISTS evaluaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  userId INTEGER NOT NULL,
  expedienteId INTEGER NOT NULL UNIQUE REFERENCES expedientes(id),
  unidadNegocios TEXT,
  empresa TEXT,
  centroCostoHeader TEXT,
  solucion TEXT,
  tipoMoneda TEXT,
  montoProyecto REAL,
  tipoCambio REAL,
  totalClp REAL,
  descripcion TEXT,
  preventa TEXT,
  fechaEntrega INTEGER,
  ejecutivoComercial TEXT,
  plazoImplementacion TEXT,
  propuestaNumero TEXT,
  paisImplementacion TEXT,
  rut TEXT,
  nombreCliente TEXT,
  nombreFantasia TEXT,
  hardware TEXT,
  materiales TEXT,
  rrhh TEXT,
  otrosGastos TEXT,
  totalHardware REAL,
  totalMateriales REAL,
  totalRrhh REAL,
  totalOtros REAL,
  totalGastos REAL,
  firmaImagen TEXT,
  f2FormStatus TEXT DEFAULT 'nuevo' NOT NULL,
  f2SavedAt INTEGER,
  status TEXT DEFAULT 'borrador' NOT NULL,
  createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  updatedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
);

CREATE TABLE IF NOT EXISTS sch_empleados (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  cargo TEXT,
  activo INTEGER DEFAULT 1 NOT NULL,
  createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  updatedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
);
CREATE TABLE IF NOT EXISTS sch_contratos (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  empleadoId INTEGER NOT NULL,
  fechaInicio TEXT NOT NULL,
  fechaFin TEXT,
  horasDiarias REAL NOT NULL,
  diasSemana TEXT NOT NULL,
  tipoDistribucion TEXT DEFAULT 'normal' NOT NULL,
  mismasHorasDiarias INTEGER DEFAULT 1 NOT NULL,
  activo INTEGER DEFAULT 1 NOT NULL,
  createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  updatedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
);
CREATE TABLE IF NOT EXISTS sch_bloques_horario (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  contratoId INTEGER NOT NULL,
  diaSemana INTEGER NOT NULL,
  horaInicio TEXT NOT NULL,
  horaFin TEXT NOT NULL,
  createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
);

CREATE TABLE IF NOT EXISTS expedientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  nombre TEXT NOT NULL,
  creadorId INTEGER NOT NULL,
  status TEXT DEFAULT 'borrador' NOT NULL,
  createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  updatedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  deleted_at INTEGER DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS resultados_expediente (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  expedienteId INTEGER NOT NULL UNIQUE REFERENCES expedientes(id),
  payload TEXT NOT NULL,
  f3FormStatus TEXT DEFAULT 'nuevo' NOT NULL,
  f3SavedAt INTEGER,
  createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  updatedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
);

CREATE TABLE IF NOT EXISTS implementaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  expedienteId INTEGER NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
  checkKey TEXT NOT NULL,
  estado INTEGER DEFAULT 0 NOT NULL,
  createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  updatedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  UNIQUE(expedienteId, checkKey)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  userId INTEGER,
  username TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entityId INTEGER,
  expedienteId INTEGER,
  actaCodigo TEXT,
  changes TEXT,
  ip TEXT,
  createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog_clausulas (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL,
  unidadNegocioId INTEGER,
  filePath TEXT NOT NULL,
  fileName TEXT NOT NULL,
  fileSize INTEGER,
  activo INTEGER DEFAULT 1 NOT NULL,
  siempre_incluir INTEGER DEFAULT 0 NOT NULL,
  tipo TEXT DEFAULT 'clausula' NOT NULL,
  orden_global INTEGER DEFAULT 50 NOT NULL,
  createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog_consideraciones_comerciales (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL,
  orden INTEGER DEFAULT 0 NOT NULL,
  activo INTEGER DEFAULT 1 NOT NULL,
  persistente INTEGER DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog_implementacion_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  descripcion TEXT DEFAULT '' NOT NULL,
  orden INTEGER DEFAULT 0 NOT NULL,
  activo INTEGER DEFAULT 1 NOT NULL
);

-- Catálogos convertidos de dinámicos → fijos
CREATE TABLE IF NOT EXISTS catalog_preventas (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_conceptos_gasto (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_gerencias (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_solicitantes (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_flujos_aprobacion (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_tipos_gasto (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_proyectos (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_tipos_pago (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_especialistas_externos (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_tecnicos_internos (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_nros_acta (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_ejecutivos_atencion (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
CREATE TABLE IF NOT EXISTS catalog_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  valor TEXT NOT NULL UNIQUE,
  activo INTEGER DEFAULT 1 NOT NULL
);
`;

export interface SqliteExecLike {
  exec(sql: string): unknown;
}

/**
 * Crea todas las tablas fijas que falten. Idempotente y seguro en cada arranque.
 */
export function ensureAllProjectTables(sqlite: SqliteExecLike): void {
  sqlite.exec(BOOTSTRAP_ALL_PROJECT_TABLES_SQL);
  sqlite.exec(`INSERT OR IGNORE INTO sqlite_sequence (name, seq) VALUES ('actas', 10000);`);
}
