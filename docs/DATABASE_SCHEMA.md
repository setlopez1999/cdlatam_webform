# Base de datos SQLite: panorama y cambios

Este documento es la referencia operativa para saber exactamente qué archivo tocar al modificar el esquema de base de datos.

## Fuente de verdad por capa

| Capa | Archivo | Qué define |
|---|---|---|
| Modelo de datos en TypeScript | [`drizzle/schema.ts`](../drizzle/schema.ts) | Tablas, columnas, tipos, relaciones declaradas en Drizzle (`references`) |
| Migraciones versionadas | [`drizzle/migrations/`](../drizzle/migrations/) + [`meta/_journal.json`](../drizzle/migrations/meta/_journal.json) | Historial aplicado por `migrate()` al arrancar |
| Bootstrap idempotente de tablas fijas | [`server/schemaBootstrap.ts`](../server/schemaBootstrap.ts) | `CREATE TABLE IF NOT EXISTS` de todas las tablas fijas |
| Ajustes incrementales para BDs existentes | [`server/db.ts`](../server/db.ts), `runMigrations` Paso 2 (`tryAlter`) | `ALTER TABLE ... ADD COLUMN ...` para BDs viejas |

Las tablas dinámicas `catalog_custom_*` se crean en runtime según `catalog_meta`.

## Tabla de decisión rápida

| Caso | Archivos obligatorios |
|---|---|
| Agregar tabla fija nueva | `drizzle/schema.ts`, migración nueva, `server/schemaBootstrap.ts` |
| Agregar columna nueva en tabla existente | `drizzle/schema.ts`, migración nueva, `server/db.ts` (Paso 2 `tryAlter`) |
| Cambiar relación/FK | `drizzle/schema.ts`, migración nueva |
| Renombrar columna o tabla | `drizzle/schema.ts`, migración manual revisada |
| Eliminar columna o tabla | `drizzle/schema.ts`, migración nueva (con estrategia de datos) |
| Solo datos (sin esquema) | Ninguno de schema/migrations/bootstrap |

## Flujo correcto para cambios de esquema

1. Editar `drizzle/schema.ts`.
2. Generar migración: `pnpm drizzle-kit generate` y revisar SQL.
3. Si cambiaste estructura base, alinear `server/schemaBootstrap.ts`.
4. Si agregas columna a tablas existentes, añadir `tryAlter(...)` en `server/db.ts` Paso 2.
5. Actualizar este documento.

## Tablas fijas actuales

| Área | Tablas |
|---|---|
| RBAC | `roles`, `users`, `user_roles` |
| Catálogos maestros | `catalog_monedas`, `catalog_paises`, `catalog_empresas`, `catalog_documento_identidad`, `catalog_unidades_negocio`, `catalog_soluciones`, `catalog_detalle_servicio`, `catalog_tipo_venta`, `catalog_plazos`, `catalog_documentos`, `catalog_cecos`, `catalog_departamentos`, `catalog_areas`, `catalog_nombres`, `catalog_consideraciones_comerciales`, `catalog_implementacion_items` |
| Meta catálogos | `catalog_meta` |
| Formularios | `actas`, `evaluaciones` |
| Expedientes | `expedientes`, `resultados_expediente`, `implementaciones` |
| Auditoría | `audit_log` |
| Cláusulas | `catalog_clausulas` |
| Horarios | `sch_empleados`, `sch_contratos`, `sch_bloques_horario` |

Relaciones de referencia: `catalog_soluciones.unidadNegocioId` → `catalog_unidades_negocio.id`, `expedientes.creadorId` → `users.id`, `catalog_clausulas.unidadNegocioId` → `catalog_unidades_negocio.id`.

## Documentación relacionada

- [`AUDITORIA_FUENTE_VERDAD.md`](./AUDITORIA_FUENTE_VERDAD.md)
- [`WORKFLOW_DB_TS_DATASOURCE.md`](./WORKFLOW_DB_TS_DATASOURCE.md)
- [`WORKFLOW_NEW_TABLE_WITH_RELATION.md`](./WORKFLOW_NEW_TABLE_WITH_RELATION.md)
- [`WORKFLOW_RENAME_TABLE.md`](./WORKFLOW_RENAME_TABLE.md)

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
