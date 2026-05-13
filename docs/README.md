# Indice de documentacion

Guia rapida para saber que documento abrir segun el tipo de cambio.

## Casos de modificacion integrada

| Quiero... | Documento principal | Complementos |
|---|---|---|
| Cambiar tablas/columnas de BD | [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) | [`WORKFLOW_DB_TS_DATASOURCE.md`](./WORKFLOW_DB_TS_DATASOURCE.md), [`AUDITORIA_FUENTE_VERDAD.md`](./AUDITORIA_FUENTE_VERDAD.md) |
| Agregar una tabla con CRUD y UI | [`WORKFLOW_NEW_TABLE_WITH_RELATION.md`](./WORKFLOW_NEW_TABLE_WITH_RELATION.md) | [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md), [`server/routes/README.md`](../server/routes/README.md) |
| Renombrar una tabla sin romper capas | [`WORKFLOW_RENAME_TABLE.md`](./WORKFLOW_RENAME_TABLE.md) | [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md), [`WORKFLOW_DB_TS_DATASOURCE.md`](./WORKFLOW_DB_TS_DATASOURCE.md) |
| Revisar fuente de verdad de auditoria | [`AUDITORIA_FUENTE_VERDAD.md`](./AUDITORIA_FUENTE_VERDAD.md) | [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) |
| Validar cambios de UI | [`WORKFLOW_UI_VERIFICATION.md`](./WORKFLOW_UI_VERIFICATION.md) | [`README.md`](../README.md) |
| Desplegar en servidor | [`DEPLOY.md`](../DEPLOY.md) | [`README.md`](../README.md) |
| Ajustar contrato con API externa (`USE_API`) | [`API_CONTRACT.md`](../API_CONTRACT.md) | [`.env.example`](../.env.example), [`README.md`](../README.md) |

## Estado de documentos

- Activos y recomendados: `DATABASE_SCHEMA`, `WORKFLOW_DB_TS_DATASOURCE`, `AUDITORIA_FUENTE_VERDAD`, `WORKFLOW_UI_VERIFICATION`, `DEPLOY`, `API_CONTRACT`.
- Historicos: `RESUMEN_MODIFICACIONES_FEATURE2`, `WORKFLOW_DB_CHANGELOG` (bitacora manual opcional).
- Con partes legacy: `WORKFLOW_NEW_TABLE_WITH_RELATION`, `WORKFLOW_RENAME_TABLE` (mantener el orden de capas, pero ejecutar migraciones con Drizzle segun `DATABASE_SCHEMA`).
