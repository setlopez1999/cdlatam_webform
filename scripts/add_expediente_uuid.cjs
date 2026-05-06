const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'gestion.db');
console.log('[Script] Abriendo BD en:', dbPath);

const db = new Database(dbPath);

// Verificar columnas actuales de actas
const cols = db.prepare('PRAGMA table_info(actas)').all();
console.log('[Script] Columnas de actas:', cols.map(c => c.name).join(', '));

const hasCol = cols.some(c => c.name === 'expedienteUuid');
if (hasCol) {
  console.log('[Script] OK: columna expedienteUuid ya existe');
} else {
  db.exec('ALTER TABLE actas ADD COLUMN expedienteUuid TEXT');
  console.log('[Script] OK: columna expedienteUuid agregada');
}

// Verificar tablas expedientes y audit_log
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('expedientes', 'audit_log')").all();
console.log('[Script] Tablas presentes:', tables.map(t => t.name).join(', ') || 'ninguna');

const cols2 = db.prepare('PRAGMA table_info(actas)').all();
console.log('[Script] Columnas finales de actas:', cols2.map(c => c.name).join(', '));

db.close();
console.log('[Script] Listo.');
