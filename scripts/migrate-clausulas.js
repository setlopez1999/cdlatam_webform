const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'gestion.db');
const db = new Database(dbPath);

console.log('[Migración] Ejecutando migración para catalog_clausulas...');

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS catalog_clausulas (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      valor text NOT NULL,
      unidadNegocioId integer,
      filePath text NOT NULL,
      fileName text NOT NULL,
      fileSize integer,
      activo integer DEFAULT 1 NOT NULL,
      createdAt integer DEFAULT (strftime('%s', 'now')) NOT NULL
    );
  `);
  console.log('[Migración] Tabla catalog_clausulas creada o ya existente.');
} catch (err) {
  console.error('[Migración] Error:', err.message);
} finally {
  db.close();
}
