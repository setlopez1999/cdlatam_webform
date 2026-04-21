#!/bin/bash
# =============================================================================
# Script de migracion manual: users v1 (openId) -> users v2 (username/password)
# Ejecutar UNA SOLA VEZ en el servidor de produccion ANTES de levantar Docker.
#
# Uso:
#   chmod +x scripts/migrate_users_v2.sh
#   ./scripts/migrate_users_v2.sh [ruta/a/gestion.db]
# =============================================================================

DB_PATH="${1:-./data/gestion.db}"

if [ ! -f "$DB_PATH" ]; then
  echo "[ERROR] No se encontro la base de datos en: $DB_PATH"
  echo "Uso: $0 /ruta/a/gestion.db"
  exit 1
fi

echo "[INFO] Base de datos: $DB_PATH"

# Verificar si la migracion ya fue aplicada (columna username ya existe)
python3 - "$DB_PATH" << 'PYEOF'
import sys, sqlite3

db_path = sys.argv[1]
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Verificar si ya tiene schema v2
cols = [r[1] for r in cur.execute('PRAGMA table_info(users)').fetchall()]
if 'username' in cols:
    print('[OK] La tabla users ya tiene el schema v2 (columna username existe). No se necesita migracion.')
    conn.close()
    sys.exit(0)

if 'openId' not in cols:
    print('[ERROR] La tabla users no tiene ni openId ni username. Estado desconocido.')
    conn.close()
    sys.exit(1)

print('[INFO] Schema viejo detectado. Columnas actuales:', cols)
print('[INFO] Aplicando migracion users v1 (openId) -> v2 (username/password)...')

try:
    # 1. Renombrar tabla vieja
    cur.execute('ALTER TABLE users RENAME TO users_v1_backup')

    # 2. Crear tabla roles si no existe (con columnas correctas del schema Drizzle)
    cur.execute('''CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        nombre TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        descripcion TEXT,
        activo INTEGER DEFAULT 1 NOT NULL,
        createdAt INTEGER NOT NULL DEFAULT 0,
        updatedAt INTEGER NOT NULL DEFAULT 0
    )''')

    # 3. Insertar roles base
    cur.executemany(
        'INSERT OR IGNORE INTO roles (nombre, label, descripcion, activo) VALUES (?, ?, ?, 1)',
        [
            ('admin',   'Administrador', 'Acceso total al sistema'),
            ('manager', 'Gerente',       'Puede ver todo, no puede gestionar usuarios'),
            ('viewer',  'Solo lectura',  'Acceso de solo lectura'),
            ('user',    'Usuario',       'Acceso basico al sistema'),
        ]
    )

    # 4. Crear nueva tabla users con schema v2
    cur.execute('''CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        passwordHash TEXT NOT NULL,
        displayName TEXT,
        role TEXT DEFAULT "user" NOT NULL,
        roleId INTEGER,
        isActive INTEGER DEFAULT 1 NOT NULL,
        createdAt INTEGER NOT NULL DEFAULT 0,
        updatedAt INTEGER NOT NULL DEFAULT 0,
        lastSignedIn INTEGER
    )''')

    # 5. Crear catalog_meta si no existe
    cur.execute('''CREATE TABLE IF NOT EXISTS catalog_meta (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        table_name TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        is_custom INTEGER DEFAULT 0 NOT NULL,
        linked_field TEXT,
        created_at INTEGER NOT NULL DEFAULT 0
    )''')

    conn.commit()
    print('[OK] Migracion aplicada exitosamente.')
    print('[INFO] Datos anteriores respaldados en: users_v1_backup')
    print('')
    print('SIGUIENTE PASO:')
    print('  docker-compose up --build -d')
    print('  (El seed automatico creara admin/1234 y usuario/1234 al arrancar)')

except Exception as e:
    conn.rollback()
    print(f'[ERROR] La migracion fallo: {e}')
    conn.close()
    sys.exit(1)

conn.close()
PYEOF
