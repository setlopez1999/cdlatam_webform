# Notas técnicas históricas y referencias

> Info rescatada de documentos obsoletos/contradictorios, consolidada aquí.

## Features sin UI

- **F3 Resultado PDF** — `generateResultadoPDF` existe en `client/src/lib/pdf/resultado-ep.ts` pero no hay botón en la UI de Resultados. Pendiente agregar trigger.

## Hooks huérfanos / dead code

- `client/src/hooks/useDynamicPermissions.ts` — llama a `trpc.permissions.getRules` pero ese procedure **no existe** en `server/routers.ts`. Tampoco existe la tabla `permission_rules` en el schema. El hook es inactivo.

## Patrón legacy de renombrar tablas (no usar)

Antes de Drizzle, se usaban scripts Python para migraciones manuales:
```python
import sqlite3
conn = sqlite3.connect('./gestion.db')
cursor = conn.cursor()
cursor.execute("ALTER TABLE old_name RENAME TO new_name;")
conn.commit()
conn.close()
```

Hoy todo se hace con Drizzle:
1. Editar `drizzle/schema.ts`
2. `pnpm drizzle-kit generate`
3. Opcional: `tryAlter` en `server/db.ts` para BDs existentes

Ver `docs/DATABASE_SCHEMA.md`.

## Error común: UNIQUE constraint

Si al arrancar aparece `UNIQUE constraint failed`, se debe a seeds no idempotentes. El proyecto usa `INSERT OR IGNORE` e índices `UNIQUE IF NOT EXISTS` para evitarlo. Todos los seeds al arranque deben ser ejecutables N veces sin error.

## Persistencia y backups

- En producción (PostgreSQL), los datos viven en el volumen Docker `pgdata`.
- Backup programable: `pg_dump` + compresión + upload a S3/Nextcloud vía cron.
- En SQLite: el archivo `gestion.db` (o `data/gestion.db` en Docker) es el único fuente.
- **Siempre** hacer backup antes de migraciones de esquema.
