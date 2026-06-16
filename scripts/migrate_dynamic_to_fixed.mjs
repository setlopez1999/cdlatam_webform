/**
 * migrate_dynamic_to_fixed.mjs
 * Migra datos de tablas dinámicas (catalog_custom_*) a las nuevas tablas fijas (catalog_*).
 * También actualiza catalog_meta para marcar las tablas convertidas como fijas.
 *
 * Ejecutar: node scripts/migrate_dynamic_to_fixed.mjs
 * Es idempotente: se puede ejecutar múltiples veces.
 */
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'gestion.db');
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

// Mapeo: [short_name] → { fixedTable, customTable, metaTableName }
const CONVERSION_MAP = {
  preventas:                { fixedTable: 'catalog_preventas',              customTable: 'catalog_custom_campo_de_preventa',        metaTableName: 'preventas' },
  concepto_gasto:           { fixedTable: 'catalog_conceptos_gasto',       customTable: 'catalog_custom_concepto_gasto',           metaTableName: 'concepto_gasto' },
  gerencias:                { fixedTable: 'catalog_gerencias',             customTable: 'catalog_custom_gerencias',                metaTableName: 'gerencias' },
  solicitante:              { fixedTable: 'catalog_solicitantes',          customTable: 'catalog_custom_solicitante',              metaTableName: 'solicitante' },
  flujo_aprobacion:         { fixedTable: 'catalog_flujos_aprobacion',    customTable: 'catalog_custom_flujo_aprobacion',          metaTableName: 'flujo_aprobacion' },
  tipo_gasto:               { fixedTable: 'catalog_tipos_gasto',           customTable: 'catalog_custom_tipo_gasto',               metaTableName: 'tipo_gasto' },
  proyecto:                 { fixedTable: 'catalog_proyectos',             customTable: 'catalog_custom_proyecto',                 metaTableName: 'proyecto' },
  tipo_pago:                { fixedTable: 'catalog_tipos_pago',            customTable: 'catalog_custom_tipo_pago',                metaTableName: 'tipo_pago' },
  especialista_externo:     { fixedTable: 'catalog_especialistas_externos', customTable: 'catalog_custom_especialista_externo',    metaTableName: 'especialista_externo' },
  tecnico_interno:          { fixedTable: 'catalog_tecnicos_internos',     customTable: 'catalog_custom_tecnico_interno',           metaTableName: 'tecnico_interno' },
  n_de_acta:                { fixedTable: 'catalog_nros_acta',             customTable: 'catalog_custom_n_de_acta',                metaTableName: 'n_de_acta' },
  ejecutivo_atencion_al_cliente: { fixedTable: 'catalog_ejecutivos_atencion', customTable: 'catalog_custom_ejecutivo_atencion_al_cliente', metaTableName: 'ejecutivo_atencion_al_cliente' },
  set:                      { fixedTable: 'catalog_sets',                  customTable: 'catalog_custom_set',                      metaTableName: 'set' },
};

let totalCopied = 0;
let totalErrors = 0;

console.log('=== Migración: tablas dinámicas → fijas ===\n');

for (const [shortName, mapping] of Object.entries(CONVERSION_MAP)) {
  try {
    // 1. Verificar si la tabla custom existe
    const customExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ?"
    ).get(mapping.customTable);

    // 2. Verificar si la tabla fija existe (debería haber sido creada por schemaBootstrap)
    const fixedExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ?"
    ).get(mapping.fixedTable);

    if (!fixedExists) {
      // Crear la tabla fija si no existe (schema Bootstrap debería haberlo hecho)
      db.exec(`CREATE TABLE IF NOT EXISTS "${mapping.fixedTable}" (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        valor TEXT NOT NULL UNIQUE,
        activo INTEGER DEFAULT 1 NOT NULL
      )`);
      console.log(`[CREATE] ${mapping.fixedTable} — creada`);
    }

    // 3. Copiar datos de custom → fixed si la custom existe y tiene datos
    let copied = 0;
    if (customExists) {
      const customRows = db.prepare(`SELECT * FROM "${mapping.customTable}"`).all();
      if (customRows.length > 0) {
        const insert = db.prepare(
          `INSERT OR IGNORE INTO "${mapping.fixedTable}" (id, valor, activo) VALUES (?, ?, ?)`
        );
        const tx = db.transaction((rows) => {
          let count = 0;
          for (const r of rows) {
            const result = insert.run(r.id, r.valor, r.activo ?? 1);
            if (result.changes > 0) count++;
          }
          return count;
        });
        copied = tx(customRows);
        totalCopied += copied;
        if (copied > 0) {
          console.log(`[COPY] ${mapping.customTable} → ${mapping.fixedTable}: ${copied} filas copiadas`);
        } else {
          console.log(`[SKIP] ${mapping.customTable}: ya migrado (0 nuevas filas)`);
        }
      } else {
        console.log(`[SKIP] ${mapping.customTable}: vacía`);
      }
    } else {
      console.log(`[SKIP] ${mapping.customTable}: no existe`);
    }

    // 4. Actualizar catalog_meta: marcar como fijo
    // Para "preventas", actualizar desde "campo_de_preventa" → "preventas"
    if (shortName === 'preventas') {
      // Eliminar entrada antigua "campo_de_preventa" si existe
      db.prepare("DELETE FROM catalog_meta WHERE table_name = 'campo_de_preventa'").run();
    }

    // Actualizar/insertar meta con is_custom = 0
    const existingMeta = db.prepare(
      "SELECT id FROM catalog_meta WHERE table_name = ?"
    ).get(mapping.metaTableName);

    if (existingMeta) {
      db.prepare(
        "UPDATE catalog_meta SET is_custom = 0 WHERE table_name = ?"
      ).run(mapping.metaTableName);
      console.log(`[META] ${mapping.metaTableName}: marcado como fijo`);
    }

  } catch (err) {
    console.error(`[ERROR] ${mapping.fixedTable}: ${err.message}`);
    totalErrors++;
  }
}

// 5. Verificar que los autoincrement IDs no colisionen con los nuevos inserts
// Reseedear la secuencia de sqlite_sequence
console.log('\n=== Reseteando secuencias autoincrement ===');
for (const [, mapping] of Object.entries(CONVERSION_MAP)) {
  try {
    const maxId = db.prepare(`SELECT COALESCE(MAX(id), 0) as max_id FROM "${mapping.fixedTable}"`).get();
    if (maxId && maxId.max_id > 0) {
      db.prepare(
        `INSERT OR REPLACE INTO sqlite_sequence (name, seq) VALUES (?, ?)`
      ).run(mapping.fixedTable, maxId.max_id);
    }
  } catch (e) {
    // sqlite_sequence puede no existir
  }
}

console.log(`\n=== Migración completada ===`);
console.log(`Filas copiadas: ${totalCopied}`);
console.log(`Errores: ${totalErrors}`);

db.close();
