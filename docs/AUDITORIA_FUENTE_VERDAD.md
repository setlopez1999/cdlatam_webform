# Auditoría de Arquitectura: Fuente de Verdad y Flujo de Peticiones

> **Última actualización:** Mayo 2026  
> Este documento refleja el estado **actual** del código. Las inconsistencias listadas anteriormente (catálogos dinámicos directos a `db.ts`) ya fueron corregidas.

## 1. Arquitectura General y Flujo de Peticiones

El proyecto usa una arquitectura cliente-servidor basada en **React + tRPC** en el frontend y **Express + tRPC + Drizzle ORM + SQLite** en el backend.

`server/routers.ts` no delega todo en un solo módulo: según el dominio, la petición sigue **una de estas ramas** (cada una es la “fuente de verdad” de su capa):

```
Cliente (React)
  → trpc.<router>.<procedure>
  → server/routers.ts
      ├─ Catálogos, usuarios, roles (prefijo ds_)
      │     → dataSource.ts → USE_API ? API_URL : db.ts
      │
      ├─ Cláusulas legales (prefijo ds_ en dataSource-clausulas.ts)
      │     → db-clausulas.ts (SQLite; preparado para API futura)
      │
      └─ Actas, evaluaciones, expedientes, horarios, audit log, búsqueda
            → db.ts (gestion.db, siempre local)
```

Migraciones SQLite: una sola cadena en `drizzle/migrations` registrada en `meta/_journal.json` (incl. 0007 cláusulas, 0008 índices audit) + `runMigrations()` en `server/db.ts` con pasos idempotentes.

## 2. Centralización de la Fuente de Verdad

### Lo que SÍ pasa por `dataSource.ts` (respeta USE_API)

| Entidad | Funciones ds_ |
|---|---|
| Catálogos fijos (monedas, países, empresas…) | `ds_getCatalogList`, `ds_createCatalogRecord`, etc. |
| Catálogos dinámicos (custom tables) | `ds_getCatalogListGeneric`, `ds_createCatalogRecordGeneric`, etc. |
| Usuarios | `ds_getUsers`, `ds_createUser`, `ds_toggleUserStatus`, etc. |
| Roles | `ds_getRoles`, `ds_createRole`, `ds_updateRole`, etc. |
| Credenciales | `ds_updateUserCredentials` |
| Resumen de catálogos (allCounts) | `ds_allCounts` |

| Cláusulas legales (PDFs) | `ds_*` en [`server/dataSource-clausulas.ts`](../server/dataSource-clausulas.ts) → [`server/db-clausulas.ts`](../server/db-clausulas.ts) |

> **Nota:** Las operaciones DDL de tablas dinámicas (`ds_createCatalogTable`, `ds_deleteCatalogTable`) son siempre SQLite-only porque son operaciones de estructura, no de datos.

### Lo que va directo a `db.ts` / SQLite (no respeta USE_API)

Las siguientes entidades **no** pasan por `dataSource.ts` — siempre leen/escriben en `gestion.db`:

| Entidad | Por qué es aceptable |
|---|---|
| **Actas de Aceptación** | Entidad core local, no se prevé sincronizar con API externa |
| **Evaluaciones de Proyecto (EP)** | Ídem |
| **Expedientes** | Ídem |
| **Audit Log** | Por diseño: el log de auditoría siempre es local |
| **Búsqueda global** (`searchRegistros`) | Busca en actas y evaluaciones, ambas locales |
| **Gestor de Horarios** | Módulo local exclusivo |
| **Autenticación** (login REST `/api/auth/login`) | Va directo a `db.ts` — ver sección 3C |

## 3. Inconsistencias Pendientes

### A. Autenticación Mixta (tRPC vs REST)

El sistema usa tRPC para casi todo, pero mantiene endpoints REST en `localAuth.ts`:
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Además, existe un `localAuth` router en tRPC que parcialmente duplica esta lógica.

**Impacto actual:** bajo (funciona correctamente). Si se activa `USE_API=true`, el login seguirá usando SQLite local.

**Recomendación:** Unificar en tRPC o en REST, eliminar la duplicidad.

### B. Actas, EP y Expedientes fuera de dataSource

El CRUD de estas entidades core se importa directamente desde `db.ts` en `routers.ts`. Si en el futuro se quiere sincronizar con API externa, hay que agregar sus `ds_` wrappers.

**Impacto actual:** ninguno (`USE_API=false` en producción). Es deuda técnica documentada.

## 4. Relación entre los dos docs de arquitectura

| Doc | Propósito |
|---|---|
| **Este archivo** (`AUDITORIA_FUENTE_VERDAD.md`) | Estado actual del sistema: qué está centralizado y qué no |
| `DATABASE_SCHEMA.md` | Panorama de tablas SQLite, bootstrap y cómo evolucionar el esquema sin BDs incompletas |
| `WORKFLOW_DB_TS_DATASOURCE.md` | Guía de uso: cómo agregar nuevas funciones respetando el patrón |

Son complementarios. Para cambios de BD, leer primero `DATABASE_SCHEMA.md`.
