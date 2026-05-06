# Flujo de Trabajo: Agregar una Nueva Tabla con Relación

Este documento detalla el proceso para crear una nueva tabla en la base de datos (ej. `roles`) y establecer una relación con una tabla existente (ej. `users`), asegurando que el CRUD y la interfaz de usuario se actualicen correctamente.

> Nota de vigencia: el orden de capas de este documento sigue siendo valido. Para ejecutar migraciones hoy, usar el flujo oficial de [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) con Drizzle (`drizzle/schema.ts`, `drizzle/migrations`, `_journal.json`, `server/schemaBootstrap.ts` y `runMigrations` Paso 2 en `server/db.ts`). Los scripts Python aqui son referencia historica.

## 1. Definición en el Schema (`drizzle/schema.ts`)

El primer paso es definir la nueva tabla y actualizar la tabla existente para incluir la clave foránea (FK blanda en SQLite).

```typescript
// 1. Definir la nueva tabla
export const roles = sqliteTable("roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull().unique(),
  label: text("label").notNull(),
  descripcion: text("descripcion"),
  activo: integer("activo").default(1),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

// 2. Actualizar la tabla existente con la FK
export const users = sqliteTable("users", {
  // ... columnas existentes
  roleId: integer("roleId"), // FK blanda a roles.id
});
```

## 2. Migración de Base de Datos (SQLite)

Crea la nueva tabla y altera la existente en la base de datos física.

```python
import sqlite3
conn = sqlite3.connect('./data/gestion.db')
cursor = conn.cursor()

# Crear nueva tabla
cursor.execute('''
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    descripcion TEXT,
    activo INTEGER DEFAULT 1,
    createdAt INTEGER DEFAULT (strftime('%s', 'now'))
)
''')

# Agregar columna a tabla existente
cursor.execute("ALTER TABLE users ADD COLUMN roleId INTEGER;")

# Insertar datos iniciales (Seed)
cursor.execute("INSERT INTO roles (nombre, label) VALUES ('admin', 'Administrador');")
cursor.execute("INSERT INTO roles (nombre, label) VALUES ('user', 'Usuario');")

conn.commit()
conn.close()
```

## 3. Implementar CRUD en `server/db.ts`

Agrega las funciones básicas para interactuar con la nueva tabla.

```typescript
import { roles, type InsertRole } from "../drizzle/schema";

export const getRoles = async () => {
  return await db.select().from(roles).orderBy(roles.nombre);
};

export const createRole = async (data: InsertRole) => {
  return await db.insert(roles).values(data).returning();
};

export const updateRole = async (id: number, data: Partial<InsertRole>) => {
  return await db.update(roles).set(data).where(eq(roles.id, id)).returning();
};

export const deleteRole = async (id: number) => {
  return await db.delete(roles).where(eq(roles.id, id)).returning();
};

// Función útil para verificar relaciones antes de eliminar
export const getUsersByRoleId = async (roleId: number) => {
  return await db.select().from(users).where(eq(users.roleId, roleId));
};
```

## 4. Exponer en `server/dataSource.ts`

Crea los wrappers `ds_*` para mantener la arquitectura de fuente de verdad centralizada.

```typescript
import { getRoles, createRole, updateRole, deleteRole, getUsersByRoleId } from "./db";

export const ds_getRoles = getRoles;
export const ds_createRole = createRole;
export const ds_updateRole = updateRole;
export const ds_deleteRole = deleteRole;
export const ds_getUsersByRoleId = getUsersByRoleId;
```

## 5. Crear Endpoints tRPC (`server/routers.ts`)

Agrega un nuevo router para la tabla y define los procedimientos protegidos.

```typescript
import { ds_getRoles, ds_createRole, ds_updateRole, ds_deleteRole, ds_getUsersByRoleId } from "./dataSource";

export const appRouter = router({
  // ... otros routers
  roles: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin") throw new Error("Acceso denegado");
      return await ds_getRoles();
    }),
    create: protectedProcedure.input(z.object({ ... })).mutation(async ({ ctx, input }) => {
      return await ds_createRole(input);
    }),
    // ... update, delete
  }),
});
```

## 6. Integración en la UI (Frontend)

1. **Queries:** Usa `trpc.roles.list.useQuery()` para obtener los datos.
2. **Mutations:** Usa `trpc.roles.create.useMutation()` para crear.
3. **Relaciones Visuales:** Al renderizar la tabla principal (`users`), busca el rol correspondiente usando el `roleId` y muestra su `label`.

```tsx
const { data: roles } = trpc.roles.list.useQuery();

const getRoleBadge = (user: UserItem) => {
  const role = roles?.find(r => r.id === user.roleId);
  return role ? <Badge>{role.label}</Badge> : <Badge variant="secondary">Sin rol</Badge>;
};
```

## 7. Manejo de Eliminación con Relaciones

Al eliminar un registro que está referenciado por otros (ej. un rol asignado a usuarios), es crucial manejar la integridad referencial:

1. **Verificar dependencias:** Antes de eliminar, consulta si hay registros dependientes (`getUsersByRoleId`).
2. **Confirmación:** Si hay dependencias, devuelve un estado especial (`requiresConfirm: true`) al frontend.
3. **Modal de Advertencia:** El frontend muestra un modal listando los registros afectados.
4. **Eliminación Forzada:** Si el usuario confirma, el backend primero desasigna la FK (`UPDATE users SET roleId = NULL WHERE roleId = X`) y luego elimina el registro principal.
