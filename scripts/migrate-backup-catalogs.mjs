/**
 * migrate-backup-catalogs.mjs
 * Migra todos los datos de catálogos del backup a la BD actual.
 * Solo toca tablas catalog_* — no modifica usuarios, roles ni expedientes.
 * Ejecutar: node scripts/migrate-backup-catalogs.mjs
 */
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKUP_PATH = '/home/ubuntu/upload/gestion_backup(2).db';
const TARGET_PATH = join(__dirname, '..', 'gestion.db');

const backup = new Database(BACKUP_PATH, { readonly: true });
const target = new Database(TARGET_PATH);

// Tablas de catálogos a migrar (solo las que existen en el backup con datos)
const CATALOG_TABLES = [
  'catalog_monedas',
  'catalog_paises',
  'catalog_empresas',
  'catalog_documento_identidad',
  'catalog_unidades_negocio',
  'catalog_soluciones',
  'catalog_detalle_servicio',
  'catalog_tipo_venta',
  'catalog_plazos',
  'catalog_documentos',
  'catalog_cecos',
  'catalog_departamentos',
  'catalog_areas',
  'catalog_nombres',
  'catalog_meta',
];

// Tablas custom que pueden no existir en la BD actual — las creamos si hace falta
const CUSTOM_CATALOG_TABLES = [
  'catalog_custom_concepto_gasto',
  'catalog_custom_especialista_externo',
  'catalog_custom_flujo_aprobacion',
  'catalog_custom_gerencias',
  'catalog_custom_proyecto',
  'catalog_custom_set',
  'catalog_custom_solicitante',
  'catalog_custom_tecnico_interno',
  'catalog_custom_tipo_gasto',
  'catalog_custom_tipo_pago',
];

let totalInserted = 0;

// Función para migrar una tabla
function migrateTable(tableName) {
  // Verificar que la tabla existe en el backup
  const existsInBackup = backup.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
  ).get(tableName);
  if (!existsInBackup) {
    console.log(`[SKIP] ${tableName} — no existe en backup`);
    return;
  }

  // Obtener el schema de la tabla en el backup
  const schemaRow = backup.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name=?"
  ).get(tableName);

  // Crear la tabla en el target si no existe (usando el schema del backup)
  const existsInTarget = target.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
  ).get(tableName);
  if (!existsInTarget) {
    console.log(`[CREATE] ${tableName} — creando tabla en BD actual`);
    target.exec(schemaRow.sql);
  }

  // Obtener todos los datos del backup
  const rows = backup.prepare(`SELECT * FROM "${tableName}"`).all();
  if (rows.length === 0) {
    console.log(`[SKIP] ${tableName} — vacía en backup`);
    return;
  }

  // Limpiar la tabla en el target e insertar los datos del backup
  target.exec(`DELETE FROM "${tableName}"`);

  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => '?').join(', ');
  const insertStmt = target.prepare(
    `INSERT OR IGNORE INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`
  );

  const insertMany = target.transaction((data) => {
    let count = 0;
    for (const row of data) {
      insertStmt.run(...columns.map(c => row[c]));
      count++;
    }
    return count;
  });

  const inserted = insertMany(rows);
  totalInserted += inserted;
  console.log(`[OK] ${tableName}: ${inserted} filas migradas`);
}

console.log('=== Iniciando migración de catálogos ===\n');

// Migrar tablas estándar
for (const table of CATALOG_TABLES) {
  migrateTable(table);
}

// Migrar tablas custom
for (const table of CUSTOM_CATALOG_TABLES) {
  migrateTable(table);
}

console.log(`\n=== Migración completada: ${totalInserted} filas en total ===`);
backup.close();
target.close();
