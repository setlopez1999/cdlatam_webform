# Flujo de Trabajo: Renombrar una Tabla en la Base de Datos

Este documento describe el proceso seguro y estructurado para renombrar una tabla existente en el proyecto, asegurando que no se rompan referencias en el backend ni en el frontend.

> Nota de vigencia: el orden de modificacion por capas de esta guia sigue vigente. Para la parte de migracion fisica, priorizar el flujo actual con Drizzle documentado en [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md). El ejemplo con script Python se conserva como referencia legacy.

## 1. Orden de Modificación

Para evitar errores de compilación o inconsistencias en tiempo de ejecución, los archivos deben modificarse estrictamente en este orden:

1. **`drizzle/schema.ts`**: Es la fuente de verdad de la estructura.
2. **Migración de Base de Datos (SQLite)**: Ejecutar el cambio físico en el archivo `.db`.
3. **`server/db.ts`**: Actualizar las consultas directas a la base de datos.
4. **`server/dataSource.ts`**: Actualizar los wrappers que exponen las funciones.
5. **`server/routers.ts`**: Actualizar los endpoints tRPC.
6. **`server/localAuth.ts`** (u otros servicios): Actualizar lógica de negocio que dependa de la tabla.
7. **Cliente (Frontend)**: Actualizar componentes React que consuman los endpoints modificados.

## 2. Paso a Paso Detallado

### Paso 1: Actualizar el Schema (`drizzle/schema.ts`)

Renombra la exportación de la tabla y sus tipos asociados.

```typescript
// Antes
export const localUsers = sqliteTable("localUsers", { ... });
export type LocalUser = typeof localUsers.$inferSelect;

// Después
export const users = sqliteTable("users", { ... });
export type User = typeof users.$inferSelect;
```

### Paso 2: Migración Física (SQLite)

Crea un script de Python o usa la CLI de SQLite para renombrar la tabla en el archivo `gestion.db`.

```python
import sqlite3
conn = sqlite3.connect('./data/gestion.db')
cursor = conn.cursor()
cursor.execute("ALTER TABLE localUsers RENAME TO users;")
conn.commit()
conn.close()
```

### Paso 3: Actualizar `server/db.ts`

Busca todas las referencias al nombre antiguo y reemplázalas. Asegúrate de actualizar los imports desde el schema.

```typescript
// Antes
import { localUsers } from "../drizzle/schema";
const result = await db.select().from(localUsers);

// Después
import { users } from "../drizzle/schema";
const result = await db.select().from(users);
```

### Paso 4: Actualizar `server/dataSource.ts`

Renombra las funciones exportadas para mantener consistencia semántica.

```typescript
// Antes
export const ds_getLocalUsers = getLocalUsers;

// Después
export const ds_getUsers = getUsers;
```

### Paso 5: Actualizar Endpoints (`server/routers.ts`)

Actualiza los imports desde `dataSource.ts` y las llamadas dentro de los resolvers tRPC.

## 3. Errores Frecuentes al Renombrar

### Error: `SyntaxError: The requested module '../drizzle/schema' does not provide an export named 'localUsers'`

**Causa:** El servidor (Vite/tsx) intentó recargar un archivo (ej. `db.ts`) que todavía importaba el nombre antiguo (`localUsers`), pero `schema.ts` ya había sido actualizado y exportaba el nombre nuevo (`users`).

**Solución:**
1. Asegúrate de actualizar **todos** los archivos que importan del schema antes de guardar.
2. Si el error persiste, reinicia el servidor de desarrollo (`pkill -f tsx && pnpm dev`), ya que a veces el HMR mantiene referencias en caché.

### Error: `SqliteError: no such table: localUsers`

**Causa:** El código fue actualizado para usar el nuevo nombre, pero la migración física en la base de datos SQLite (Paso 2) no se ejecutó o falló.

**Solución:** Verifica la estructura de la base de datos conectándote directamente (`sqlite3 ./data/gestion.db ".schema"`) y ejecuta el `ALTER TABLE` si es necesario.
