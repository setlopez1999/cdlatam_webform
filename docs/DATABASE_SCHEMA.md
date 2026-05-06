# Base de datos SQLite: panorama y cambios

Este documento es la referencia operativa para saber que archivo tocar cuando cambias el esquema de BD.

## Fuente de verdad por capa

| Capa | Archivo | Que define |
|---|---|---|
| Modelo TypeScript | [`drizzle/schema.ts`](../drizzle/schema.ts) | Tablas, columnas, tipos y relaciones Drizzle |
| Migraciones versionadas | [`drizzle/migrations/`](../drizzle/migrations/) + [`meta/_journal.json`](../drizzle/migrations/meta/_journal.json) | Historial aplicado por `migrate()` |
| Bootstrap idempotente | [`server/schemaBootstrap.ts`](../server/schemaBootstrap.ts) | `CREATE TABLE IF NOT EXISTS` para tablas fijas |
| Ajustes incrementales | [`server/db.ts`](../server/db.ts), `runMigrations` Paso 2 (`tryAlter`) | `ALTER TABLE ... ADD COLUMN ...` para BDs viejas |

Las tablas dinamicas `catalog_custom_*` no viven en bootstrap; se crean en runtime desde `catalog_meta`.

## Tabla de decision (que tocar segun el caso)

| Caso | Archivos obligatorios | Recomendado |
|---|---|---|
| Agregar tabla fija | `drizzle/schema.ts`, nueva migracion en `drizzle/migrations/`, `server/schemaBootstrap.ts` | Actualizar esta doc |
| Agregar columna en tabla existente | `drizzle/schema.ts`, nueva migracion, `server/db.ts` (Paso 2 `tryAlter`) | Alinear `server/schemaBootstrap.ts` |
| Cambiar FK/relacion | `drizzle/schema.ts`, nueva migracion | Revisar bootstrap si cambia definicion base |
| Renombrar tabla o columna | `drizzle/schema.ts`, migracion manual revisada | Compatibilidad temporal en `server/db.ts` si aplica |
| Eliminar tabla o columna | `drizzle/schema.ts`, migracion con estrategia de datos | Documentar impacto |
| Solo datos (sin esquema) | No tocar schema/migrations/bootstrap | Cambios de negocio/seed |

## Flujo correcto cuando cambias esquema

1. Editar [`drizzle/schema.ts`](../drizzle/schema.ts).
2. Generar migracion con `pnpm drizzle-kit generate`.
3. Revisar SQL generado y journal en [`drizzle/migrations/meta/_journal.json`](../drizzle/migrations/meta/_journal.json).
4. Si cambias estructura base, alinear [`server/schemaBootstrap.ts`](../server/schemaBootstrap.ts).
5. Si agregas columna a tablas ya existentes, anadir `tryAlter("ALTER TABLE ... ADD COLUMN ...")` en Paso 2 de [`server/db.ts`](../server/db.ts).
6. Actualizar esta documentacion.

## Documentacion relacionada

- [`README.md`](../README.md) - entrada general del proyecto.
- [`README.md`](./README.md) - indice de documentacion por casos.
- [`WORKFLOW_DB_TS_DATASOURCE.md`](./WORKFLOW_DB_TS_DATASOURCE.md) - patron `ds_*`.
- [`AUDITORIA_FUENTE_VERDAD.md`](./AUDITORIA_FUENTE_VERDAD.md) - flujo de auditoria.
- [`WORKFLOW_NEW_TABLE_WITH_RELATION.md`](./WORKFLOW_NEW_TABLE_WITH_RELATION.md) - orden de capas para tabla nueva (con nota de flujo legacy).
- [`WORKFLOW_RENAME_TABLE.md`](./WORKFLOW_RENAME_TABLE.md) - orden seguro para renombrar (con nota de flujo legacy).
# Base de datos SQLite: panorama y cambios

Este documento es la referencia operativa para saber **exactamente qué archivo tocar** al modificar el esquema de base de datos.

## Fuente de verdad por capa

| Capa | Archivo | Qué define |
|---|---|---|
| Modelo de datos en TypeScript | [`drizzle/schema.ts`](../drizzle/schema.ts) | Tablas, columnas, tipos, relaciones declaradas en Drizzle (`references`) |
| Migraciones versionadas | [`drizzle/migrations/`](../drizzle/migrations/) + [`drizzle/migrations/meta/_journal.json`](../drizzle/migrations/meta/_journal.json) | Historial de cambios que `migrate()` aplica al arrancar |
| Bootstrap idempotente de tablas fijas | [`server/schemaBootstrap.ts`](../server/schemaBootstrap.ts) | `CREATE TABLE IF NOT EXISTS` de todas las tablas fijas para evitar BD incompleta |
| Ajustes incrementales para BDs ya existentes | [`server/db.ts`](../server/db.ts), `runMigrations` Paso 2 (`tryAlter`) | `ALTER TABLE ... ADD COLUMN ...` cuando una tabla vieja ya existe sin la nueva columna |

Las tablas dinámicas `catalog_custom_*` no están en `schemaBootstrap`; se crean en runtime según `catalog_meta`.

## Tabla de decisión rápida (qué tocar según el caso)

| Caso | Archivos obligatorios | Archivos opcionales/recomendados |
|---|---|---|
| **Agregar tabla fija nueva** | `drizzle/schema.ts`, migración nueva en `drizzle/migrations`, `server/schemaBootstrap.ts` | `docs/DATABASE_SCHEMA.md` |
| **Agregar columna nueva en tabla existente** | `drizzle/schema.ts`, migración nueva, `server/db.ts` (Paso 2 `tryAlter`) | `server/schemaBootstrap.ts` (alinear `CREATE TABLE`), `docs/DATABASE_SCHEMA.md` |
| **Cambiar relación/FK** | `drizzle/schema.ts`, migración nueva | `server/schemaBootstrap.ts` (si cambia definición base), `docs/DATABASE_SCHEMA.md` |
| **Renombrar columna o tabla** | `drizzle/schema.ts`, migración nueva manual/revisada | `server/schemaBootstrap.ts`, `server/db.ts` (si requiere compatibilidad temporal), `docs/DATABASE_SCHEMA.md` |
| **Eliminar columna o tabla** | `drizzle/schema.ts`, migración nueva (con estrategia de datos) | `server/schemaBootstrap.ts`, `docs/DATABASE_SCHEMA.md` |
| **Solo cambiar datos (sin esquema)** | Ninguno de schema/migrations/bootstrap | Solo código de negocio/seed/scripts |

## Flujo correcto cuando cambias esquema

1. Editar [`drizzle/schema.ts`](../drizzle/schema.ts).
2. Generar migración (`pnpm drizzle-kit generate`) y revisar SQL generado.
3. Confirmar que la migración quedó registrada en [`drizzle/migrations/meta/_journal.json`](../drizzle/migrations/meta/_journal.json).
4. Si cambiaste estructura base, alinear [`server/schemaBootstrap.ts`](../server/schemaBootstrap.ts).
5. Si la tabla ya existe en instalaciones previas y agregaste columna, añadir `tryAlter("ALTER TABLE ... ADD COLUMN ...")` en [`server/db.ts`](../server/db.ts), Paso 2.
6. Actualizar este documento con el cambio.

## Archivos que NO debes olvidar revisar

- [`server/routers.ts`](../server/routers.ts) y/o routers en `server/routers/` si cambió payload o forma de consulta.
- [`server/dataSource.ts`](../server/dataSource.ts) / [`server/dataSource-clausulas.ts`](../server/dataSource-clausulas.ts) si el CRUD pasa por capa `ds_*`.
- Tipos cliente/validaciones Zod si agregaste campos nuevos en endpoints.

## Tablas fijas actuales (resumen)

| Área | Tablas |
|---|---|
| RBAC | `roles`, `users`, `user_roles` |
| Catálogos maestros | `catalog_monedas`, `catalog_paises`, `catalog_empresas`, `catalog_documento_identidad`, `catalog_unidades_negocio`, `catalog_soluciones`, `catalog_detalle_servicio`, `catalog_tipo_venta`, `catalog_plazos`, `catalog_documentos`, `catalog_cecos`, `catalog_departamentos`, `catalog_areas`, `catalog_nombres` |
| Meta catálogos | `catalog_meta` |
| Formularios | `actas`, `evaluaciones` |
| Expedientes | `expedientes`, `resultados_expediente` |
| Auditoría | `audit_log` |
| Cláusulas | `catalog_clausulas` |
| Horarios | `sch_empleados`, `sch_contratos`, `sch_bloques_horario` |

Relaciones de referencia frecuentes:
- `catalog_soluciones.unidadNegocioId` -> `catalog_unidades_negocio.id`
- `expedientes.creadorId` -> `users.id` (FK blanda por convención)
- `catalog_clausulas.unidadNegocioId` -> `catalog_unidades_negocio.id`

## Documentación relacionada

- [`AUDITORIA_FUENTE_VERDAD.md`](./AUDITORIA_FUENTE_VERDAD.md) — qué módulos usan `dataSource` vs `db.ts`.
- [`WORKFLOW_DB_TS_DATASOURCE.md`](./WORKFLOW_DB_TS_DATASOURCE.md) — patrón `ds_*` para nuevas funciones de datos.
# Base de datos SQLite: panorama y cambios

Este documento es el **índice único** para entender qué tablas existen, cómo se crean y cómo evolucionar el esquema sin dejar BDs incompletas.

## Jerarquía de fuentes de verdad

| Capa | Archivo / ubicación | Rol |
|------|----------------------|-----|
| **Modelo TypeScript (columnas y tipos)** | [`drizzle/schema.ts`](../drizzle/schema.ts) | Definición Drizzle usada por queries; debe reflejar la realidad de SQLite. |
| **Migraciones versionadas** | [`drizzle/migrations/`](../drizzle/migrations/) + [`meta/_journal.json`](../drizzle/migrations/meta/_journal.json) | Historial aplicado por `migrate()` al arrancar. |
| **Bootstrap idempotente** | [`server/schemaBootstrap.ts`](../server/schemaBootstrap.ts) | `CREATE TABLE IF NOT EXISTS` para **todas** las tablas fijas del proyecto. Se ejecuta tras cada `migrate()` (y en fallback si Drizzle falla). Evita tablas ausentes por estados inconsistentes. |
| **Ajustes incrementales** | [`server/db.ts`](../server/db.ts) → `runMigrations` Paso 2 (`tryAlter`) | `ALTER TABLE` para columnas nuevas en BDs ya existentes (SQLite no tiene `ADD COLUMN IF NOT EXISTS`). |

Las tablas dinámicas `catalog_custom_*` **no** están en `schemaBootstrap`; se crean en runtime según `catalog_meta`.

## Tablas fijas actuales (resumen)

| Área | Tablas |
|------|--------|
| RBAC | `roles`, `users`, `user_roles` |
| Catálogos maestros | `catalog_monedas`, `catalog_paises`, `catalog_empresas`, `catalog_documento_identidad`, `catalog_unidades_negocio`, `catalog_soluciones`, `catalog_detalle_servicio`, `catalog_tipo_venta`, `catalog_plazos`, `catalog_documentos`, `catalog_cecos`, `catalog_departamentos`, `catalog_areas`, `catalog_nombres` |
| Meta catálogos | `catalog_meta` |
| Formularios | `actas`, `evaluaciones` |
| Expedientes | `expedientes`, `resultados_expediente` |
| Auditoría | `audit_log` |
| Cláusulas | `catalog_clausulas` |
| Horarios | `sch_empleados`, `sch_contratos`, `sch_bloques_horario` |

Relaciones relevantes (FK blandas / por convención): `catalog_soluciones.unidadNegocioId` → `catalog_unidades_negocio.id`; `expedientes.creadorId` → `users.id`; `catalog_clausulas.unidadNegocioId` → `catalog_unidades_negocio.id`.

## Cómo agregar o cambiar una tabla o columna

1. Editar [`drizzle/schema.ts`](../drizzle/schema.ts).
2. Generar migración: `pnpm drizzle-kit generate` (o el comando que use el equipo).
3. Revisar el SQL generado y el journal.
4. Actualizar [`server/schemaBootstrap.ts`](../server/schemaBootstrap.ts): añadir o ajustar el bloque `CREATE TABLE IF NOT EXISTS` correspondiente para que arranques nuevos o BD inconsistente no queden sin la tabla.
5. Si es solo columna nueva en tablas ya desplegadas, añadir un `tryAlter(\`ALTER TABLE ... ADD COLUMN ...\`)` en el Paso 2 de `runMigrations` en [`server/db.ts`](../server/db.ts).
6. Actualizar este documento (tabla resumen o notas).

## Documentación relacionada

- [`AUDITORIA_FUENTE_VERDAD.md`](./AUDITORIA_FUENTE_VERDAD.md) — qué código usa `dataSource` vs `db.ts`.
- [`WORKFLOW_DB_TS_DATASOURCE.md`](./WORKFLOW_DB_TS_DATASOURCE.md) — patrón `ds_*` para nuevas funciones de datos.
