"""
Migración: localUsers → users, eliminar tabla users antigua (OAuth), crear tabla roles
"""
import sqlite3
import time

DB_PATH = "/home/ubuntu/cdlatam_webform/data/gestion.db"

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

print("=== Iniciando migración ===\n")

# 1. Verificar estado actual
cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables_before = [r[0] for r in cur.fetchall()]
print(f"Tablas antes: {tables_before}\n")

# 2. Verificar que la tabla users antigua está vacía antes de eliminarla
cur.execute("SELECT COUNT(*) FROM users")
users_old_count = cur.fetchone()[0]
print(f"Registros en 'users' (antigua OAuth): {users_old_count}")

cur.execute("SELECT COUNT(*) FROM localUsers")
local_users_count = cur.fetchone()[0]
print(f"Registros en 'localUsers': {local_users_count}\n")

# 3. Crear tabla roles
print("Creando tabla 'roles'...")
cur.execute("""
    CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        descripcion TEXT,
        activo INTEGER NOT NULL DEFAULT 1,
        createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
""")
print("  ✓ Tabla 'roles' creada")

# 4. Seed de roles base
now = int(time.time())
roles_seed = [
    ("admin", "Administrador", "Acceso total al sistema"),
    ("viewer", "Solo lectura", "Acceso de solo lectura"),
    ("user", "Usuario", "Acceso básico al sistema"),
]
for nombre, label, desc in roles_seed:
    cur.execute("SELECT id FROM roles WHERE nombre = ?", (nombre,))
    if not cur.fetchone():
        cur.execute(
            "INSERT INTO roles (nombre, label, descripcion, activo, createdAt, updatedAt) VALUES (?, ?, ?, 1, ?, ?)",
            (nombre, label, desc, now, now)
        )
        print(f"  ✓ Rol '{nombre}' insertado")
    else:
        print(f"  - Rol '{nombre}' ya existe, omitido")

# 5. Agregar columna roleId a localUsers (antes de renombrar)
print("\nAgregando columna roleId a localUsers...")
try:
    cur.execute("ALTER TABLE localUsers ADD COLUMN roleId INTEGER")
    print("  ✓ Columna roleId agregada")
except sqlite3.OperationalError as e:
    print(f"  - roleId ya existe: {e}")

# 6. Asignar roleId basado en el campo role actual
print("Asignando roleId según role actual...")
cur.execute("SELECT id, nombre FROM roles")
roles_map = {r[1]: r[0] for r in cur.fetchall()}
print(f"  Mapa de roles: {roles_map}")

cur.execute("SELECT id, role FROM localUsers")
local_users = cur.fetchall()
for uid, role_str in local_users:
    role_id = roles_map.get(role_str, roles_map.get("user"))
    cur.execute("UPDATE localUsers SET roleId = ? WHERE id = ?", (role_id, uid))
    print(f"  ✓ Usuario id={uid} role='{role_str}' → roleId={role_id}")

# 7. Renombrar localUsers → users_new (SQLite no permite renombrar si hay conflicto de nombre)
# Primero eliminamos la tabla users antigua (OAuth), luego renombramos
print("\nEliminando tabla 'users' antigua (OAuth, vacía)...")
if users_old_count == 0:
    cur.execute("DROP TABLE IF EXISTS users")
    print("  ✓ Tabla 'users' antigua eliminada")
else:
    print(f"  ⚠ La tabla 'users' tiene {users_old_count} registros, NO se elimina por seguridad")
    conn.close()
    exit(1)

# 8. Renombrar localUsers → users
print("Renombrando 'localUsers' → 'users'...")
cur.execute("ALTER TABLE localUsers RENAME TO users")
print("  ✓ Renombrado exitoso")

conn.commit()

# 9. Verificar estado final
cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables_after = [r[0] for r in cur.fetchall()]
print(f"\nTablas después: {tables_after}")

cur.execute("SELECT id, username, role, roleId, isActive FROM users")
print("\nUsuarios finales:")
for r in cur.fetchall():
    print(f"  {r}")

cur.execute("SELECT id, nombre, label FROM roles")
print("\nRoles:")
for r in cur.fetchall():
    print(f"  {r}")

conn.close()
print("\n=== Migración completada exitosamente ===")
