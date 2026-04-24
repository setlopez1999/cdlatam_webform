# Registro de Cambios en Base de Datos (Changelog)

**Regla del Proyecto:** Cada vez que se modifique el schema de la base de datos (nuevas tablas, columnas, índices, etc.), se debe dejar constancia en este archivo. Esto permite mantener un historial claro de la evolución de la estructura de datos y facilita la sincronización entre desarrolladores.

---

## [2026-04-24] — Fase 1: Tablas para Integridad de Expedientes y Auditoría

**Rama:** `features`
**Archivos modificados:** `drizzle/schema.ts`, `server/db.ts`

### Cambios

| Tipo | Tabla | Detalle |
|---|---|---|
| NUEVA TABLA | `expedientes` | `id`, `uuid`, `nombre`, `creadorId`, `actaId`, `evaluacionId`, `status`, `createdAt`, `updatedAt` |
| NUEVA TABLA | `audit_log` | `id`, `userId`, `username`, `action`, `entity`, `entityId`, `changes` (JSON), `ip`, `createdAt` |

### Razón
Preparar la base de datos para la migración de los expedientes desde `localStorage` (Zustand) hacia SQLite, permitiendo trazabilidad, auditoría y control de acceso por roles.

### Cómo revertir
Eliminar las tablas del schema y borrar las funciones CRUD correspondientes en `server/db.ts`.

---

## [2026-04-24] — Fase 0: Vincular Actas con Expedientes (Persistencia F1)

**Rama:** `features`
**Archivos modificados:** `drizzle/schema.ts`, `server/db.ts`, `drizzle/migrations/0006_expedientes_actas_link.sql`

### Cambios

| Tipo | Tabla | Detalle |
|---|---|---|
| NUEVA COLUMNA | `actas` | `expedienteUuid TEXT` — vínculo con el nanoid del store de Zustand |

### Razón
Conectar el store de Zustand con la BD: al guardar F1, se llama `trpc.actas.syncF1` que crea o actualiza el acta en BD vinculada al expediente por su `expedienteUuid`. También actualiza `expedientes.actaId` con la FK blanda.

### Nuevos endpoints tRPC
- `actas.syncF1` — crea o actualiza el acta vinculada a un expediente (upsert por `expedienteUuid`)
- `actas.getByExpedienteUuid` — obtiene el acta de un expediente por su uuid

### Cómo revertir
Eliminar la columna `expedienteUuid` de `actas` y los procedures `syncF1` / `getByExpedienteUuid` de `routers.ts`.
