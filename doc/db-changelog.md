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
