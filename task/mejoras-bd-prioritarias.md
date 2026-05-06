# Mejoras BD / capa de datos — priorizadas (corto)

Referencia: revisión rápida de coherencia (Drizzle + SQLite + `server/db.ts`).

## P1 — Impacto alto / deuda que duele al crecer

1. **Partir `server/db.ts`**: hoy concentra conexión, DDL de catálogos y muchas consultas. Extraer módulos por dominio (expedientes, catálogos, usuarios, etc.) reduce conflictos en git y acelera onboarding.

2. **FKs en SQLite**: asegurar `PRAGMA foreign_keys = ON` al abrir la conexión y, donde aplique, alinear borrados con integridad (orden de delete o `ON DELETE` en esquema) para no depender solo de “convención en código”.

## P2 — Calidad y menos duplicación

3. **Unificar acceso a datos**: hoy hay `db.ts`, `db-clausulas.ts` y `dataSource-*`. Mantener una sola capa visible para routers (o reglas claras: “todo catálogo X va por dataSource”) evita doble lógica al migrar a API.

4. **`getDb()` async innecesario**: si el driver es síncrono, valorar API síncrona o documentar por qué es `async` (preparar swap de driver) para no confundir.

## P3 — Pulido

5. **`users.role` vs `users.roleId`**: dos fuentes de verdad para rol; a medio plazo conviene una sola (idealmente `roleId` + join a `roles`).

6. **Índices**: revisar columnas filtradas siempre (`expedienteUuid`, fechas, `userId`) y añadir índices si los listados crecen.

---
*Lista corta; ampliar solo si se hace auditoría formal o cambio a MySQL/API.*
