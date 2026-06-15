import Database from 'better-sqlite3';
const db = new Database('C:\\Users\\PC1\\Desktop\\P\\cdlatam_webform\\gestion.db');

// Check catalog_custom_preventas
console.log('=== catalog_custom_preventas ===');
const p = db.prepare('SELECT * FROM catalog_custom_preventas').all();
console.log(JSON.stringify(p, null, 2));

// Check catalog_preventa (note: no _custom_ prefix)
console.log('\n=== catalog_preventa ===');
try {
  const r = db.prepare('SELECT * FROM catalog_preventa').all();
  console.log(JSON.stringify(r, null, 2));
} catch(e) { console.log('No existe:', e.message); }

// Check catalog_nombres
console.log('\n=== catalog_nombres ===');
const n = db.prepare('SELECT * FROM catalog_nombres').all();
console.log(JSON.stringify(n, null, 2));

// Check catalog_meta for preventa entries
console.log('\n=== catalog_meta ===');
const m = db.prepare("SELECT * FROM catalog_meta WHERE title LIKE '%preventa%' OR tableName LIKE '%preven%'").all();
console.log(JSON.stringify(m, null, 2));
