-- ============================================================
-- Migración v2: Ajuste-12 - Eliminar columnas legacy
-- ============================================================

-- 1. expedientes: remover uuid, codigo, nro_acta, actaId, evaluacionId
CREATE TABLE expedientes_temp (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  nombre TEXT NOT NULL,
  creadorId INTEGER NOT NULL,
  status TEXT DEFAULT 'borrador' NOT NULL,
  createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  updatedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  deleted_at INTEGER DEFAULT NULL
);

INSERT INTO expedientes_temp (id, nombre, creadorId, status, createdAt, updatedAt, deleted_at)
  SELECT id, nombre, creadorId, status, createdAt, updatedAt, deleted_at FROM expedientes;

DROP TABLE expedientes;
ALTER TABLE expedientes_temp RENAME TO expedientes;

-- 2. actas: remover expedienteUuid
CREATE TABLE actas_temp (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  userId INTEGER NOT NULL,
  expedienteId INTEGER NOT NULL UNIQUE REFERENCES expedientes(id),
  nro_acta INTEGER UNIQUE,
  codigo TEXT UNIQUE,
  noActa TEXT, atencion TEXT, fecha INTEGER,
  razonSocial TEXT, nombreFantasia TEXT, rucDniRut TEXT, direccionComercial TEXT,
  representanteLegal TEXT, representanteDni TEXT, representanteEmail TEXT, representanteFono TEXT,
  contactoTecnico TEXT, contactoTecnicoEmail TEXT, contactoTecnicoFono TEXT,
  contactoFacturacion TEXT, contactoFacturacionEmail TEXT, contactoFacturacionFono TEXT,
  serviciosContratados TEXT, formasPagoImplementacion TEXT, formasPagoMantencion TEXT,
  status TEXT DEFAULT 'borrador' NOT NULL,
  f1Datos TEXT, f1FormStatus TEXT DEFAULT 'nuevo' NOT NULL, f1SavedAt INTEGER,
  createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  updatedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
);

INSERT INTO actas_temp (id, userId, expedienteId, nro_acta, codigo, noActa, atencion, fecha, razonSocial, nombreFantasia, rucDniRut, direccionComercial, representanteLegal, representanteDni, representanteEmail, representanteFono, contactoTecnico, contactoTecnicoEmail, contactoTecnicoFono, contactoFacturacion, contactoFacturacionEmail, contactoFacturacionFono, serviciosContratados, formasPagoImplementacion, formasPagoMantencion, status, f1Datos, f1FormStatus, f1SavedAt, createdAt, updatedAt)
  SELECT id, userId, expedienteId, nro_acta, codigo, noActa, atencion, fecha, razonSocial, nombreFantasia, rucDniRut, direccionComercial, representanteLegal, representanteDni, representanteEmail, representanteFono, contactoTecnico, contactoTecnicoEmail, contactoTecnicoFono, contactoFacturacion, contactoFacturacionEmail, contactoFacturacionFono, serviciosContratados, formasPagoImplementacion, formasPagoMantencion, status, f1Datos, f1FormStatus, f1SavedAt, createdAt, updatedAt FROM actas;

DROP TABLE actas;
ALTER TABLE actas_temp RENAME TO actas;

-- 3. evaluaciones: remover actaId, expedienteUuid; nombreFantasia no existia (SELECT NULL)
CREATE TABLE evaluaciones_temp (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  userId INTEGER NOT NULL,
  expedienteId INTEGER NOT NULL UNIQUE REFERENCES expedientes(id),
  unidadNegocios TEXT, empresa TEXT, centroCostoHeader TEXT, solucion TEXT,
  tipoMoneda TEXT, montoProyecto REAL, tipoCambio REAL, totalClp REAL,
  descripcion TEXT, preventa TEXT, fechaEntrega INTEGER,
  ejecutivoComercial TEXT, plazoImplementacion TEXT, propuestaNumero TEXT,
  paisImplementacion TEXT, rut TEXT, nombreCliente TEXT, nombreFantasia TEXT,
  hardware TEXT, materiales TEXT, rrhh TEXT, otrosGastos TEXT,
  totalHardware REAL, totalMateriales REAL, totalRrhh REAL, totalOtros REAL, totalGastos REAL,
  firmaImagen TEXT,
  f2FormStatus TEXT DEFAULT 'nuevo' NOT NULL, f2SavedAt INTEGER,
  status TEXT DEFAULT 'borrador' NOT NULL,
  createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  updatedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
);

INSERT INTO evaluaciones_temp (id, userId, expedienteId, unidadNegocios, empresa, centroCostoHeader, solucion, tipoMoneda, montoProyecto, tipoCambio, totalClp, descripcion, preventa, fechaEntrega, ejecutivoComercial, plazoImplementacion, propuestaNumero, paisImplementacion, rut, nombreCliente, nombreFantasia, hardware, materiales, rrhh, otrosGastos, totalHardware, totalMateriales, totalRrhh, totalOtros, totalGastos, firmaImagen, f2FormStatus, f2SavedAt, status, createdAt, updatedAt)
  SELECT id, userId, expedienteId, unidadNegocios, empresa, centroCostoHeader, solucion, tipoMoneda, montoProyecto, tipoCambio, totalClp, descripcion, preventa, fechaEntrega, ejecutivoComercial, plazoImplementacion, propuestaNumero, paisImplementacion, rut, nombreCliente, NULL, hardware, materiales, rrhh, otrosGastos, totalHardware, totalMateriales, totalRrhh, totalOtros, totalGastos, firmaImagen, f2FormStatus, f2SavedAt, status, createdAt, updatedAt FROM evaluaciones;

DROP TABLE evaluaciones;
ALTER TABLE evaluaciones_temp RENAME TO evaluaciones;

-- 4. resultados_expediente: remover expedienteUuid
CREATE TABLE resultados_temp (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  expedienteId INTEGER NOT NULL UNIQUE REFERENCES expedientes(id),
  payload TEXT NOT NULL,
  f3FormStatus TEXT DEFAULT 'nuevo' NOT NULL,
  f3SavedAt INTEGER,
  createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  updatedAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
);

INSERT INTO resultados_temp (id, expedienteId, payload, f3FormStatus, f3SavedAt, createdAt, updatedAt)
  SELECT id, expedienteId, payload, f3FormStatus, f3SavedAt, createdAt, updatedAt FROM resultados_expediente;

DROP TABLE resultados_expediente;
ALTER TABLE resultados_temp RENAME TO resultados_expediente;

-- 5. audit_log: remover expedienteUuid
CREATE TABLE audit_log_temp (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  userId INTEGER, username TEXT NOT NULL,
  action TEXT NOT NULL, entity TEXT NOT NULL, entityId INTEGER,
  expedienteId INTEGER,
  expedienteCodigo TEXT,
  changes TEXT, ip TEXT,
  createdAt INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
);

INSERT INTO audit_log_temp (id, userId, username, action, entity, entityId, expedienteId, expedienteCodigo, changes, ip, createdAt)
  SELECT id, userId, username, action, entity, entityId, expedienteId, expedienteCodigo, changes, ip, createdAt FROM audit_log;

DROP TABLE audit_log;
ALTER TABLE audit_log_temp RENAME TO audit_log;

SELECT 'OK';
