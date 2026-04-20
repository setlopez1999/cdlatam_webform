# Workflow: Auto-migración de schema `users` v1 → v2

## Contexto

La tabla `users` fue rediseñada cuando se eliminó el sistema OAuth y se adoptó autenticación local (username/password). El schema cambió así:

| Campo v1 (OAuth) | Campo v2 (Local) |
|---|---|
| `openId` (PK lógico) | `username` |
| `name` | `displayName` |
| `email` | — (eliminado) |
| `loginMethod` | — (eliminado) |
| `activo` | `isActive` |
| — | `passwordHash` |
| — | `roleId` |

El problema: la BD en producción tenía el schema v1 y el código nuevo buscaba `username`, causando el error:

```
no such column: "username" - should this be a string literal in single-quotes?
```

## Solución implementada

Se agregó la función `autoMigrateUsersSchemaIfNeeded()` en `server/db.ts`, que se ejecuta **automáticamente al arrancar el servidor**, antes de cualquier migración de Drizzle.

### Comportamiento (idempotente)

| Estado de la BD | Acción |
|---|---|
| `users` tiene columna `username` (schema v2) | No hace nada — log: `users schema v2 detected` |
| `users` tiene columna `openId` (schema v1) | Migra automáticamente — log: `users schema migrated to v2` |
| `users` no existe aún | No hace nada — Drizzle la crea después |

### Qué hace la migración automática

1. Renombra `users` → `users_v1_backup` (los datos viejos no se pierden)
2. Crea `roles` si no existe (con columnas `nombre`, `label`, `descripcion`, `activo`)
3. Inserta los 4 roles base (`admin`, `manager`, `viewer`, `user`) con `INSERT OR IGNORE`
4. Crea la nueva tabla `users` con el schema v2
5. Crea `catalog_meta` si no existe

### Flujo de arranque completo

```
docker-compose up --build -d
  → servidor arranca
  → autoMigrateUsersSchemaIfNeeded()   ← detecta y migra si es necesario
  → migrate() de Drizzle               ← aplica migraciones pendientes
  → seedCatalogMeta()                  ← sincroniza metadatos de catálogos
  → seedDefaultUsers()                 ← crea admin/1234 y usuario/5678 si no existen
  → Server running on :3000
```

## Logs esperados en producción (primera vez)

```
[DB] Conectando a base de datos en: ./data/gestion.db
[DB] users schema v1 (openId) detected — migrating to v2 (username/password)...
[DB] users schema migrated to v2 successfully. Old data backed up in users_v1_backup.
[DB] Migrations applied successfully
[LocalAuth] Created default user: admin (admin)
[LocalAuth] Created default user: usuario (user)
Server running on http://0.0.0.0:3000/
```

## Logs esperados en reinicios posteriores

```
[DB] Conectando a base de datos en: ./data/gestion.db
[DB] users schema v2 detected — no migration needed
[DB] Migrations applied successfully
Server running on http://0.0.0.0:3000/
```

## Archivos involucrados

| Archivo | Cambio |
|---|---|
| `server/db.ts` | Función `autoMigrateUsersSchemaIfNeeded()` agregada antes de `runMigrations()` |
| `drizzle/migrations/0003_users_schema_v2.sql` | Migración SQL equivalente (referencia, no se ejecuta automáticamente) |
| `scripts/migrate_users_v2.sh` | Script manual alternativo (solo si no se puede usar Docker) |

## Extensibilidad

Para futuras migraciones de schema que no puedan manejarse con `ALTER TABLE` estándar de Drizzle (ej: renombrar columnas, cambiar tipos), seguir el mismo patrón:

1. Agregar una función `autoMigrate<Nombre>IfNeeded()` en `server/db.ts`
2. Detectar el estado viejo con `pragma_table_info`
3. Aplicar la transformación con `sqlite.exec()`
4. Llamarla al inicio de `runMigrations()` antes del `migrate()` de Drizzle
5. Documentar en `docs/WORKFLOW_AUTO_MIGRATION_<NOMBRE>.md`
