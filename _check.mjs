import Database from 'better-sqlite3';
const db = new Database('data/gestion.db');

// List ALL tables first
const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('ALL_TABLES:', JSON.stringify(allTables.map(t => t.name), null, 2));

// Filter preventa-related
const preventaTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%preventa%' OR name LIKE '%Preventa%')").all();
console.log('PREVENTA_TABLES:', JSON.stringify(preventaTables, null, 2));

// Try catalog_meta if it exists
try {
  const meta = db.prepare("SELECT * FROM catalog_meta WHERE table_name LIKE '%preventa%'").all();
  console.log('META:', JSON.stringify(meta, null, 2));
} catch(e) {
  console.log('no catalog_meta table');
}

// Try catalog_custom_preventa
try {
  const custom = db.prepare("SELECT * FROM catalog_custom_preventa").all();
  console.log('CUSTOM_DATA:', JSON.stringify(custom, null, 2));
} catch(e) {
  console.log('No catalog_custom_preventa table');
}

db.close();
