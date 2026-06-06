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

## Errores frecuentes (dev local / SQLite)

| Síntoma | Documento |
|---|---|
| No arranca / `better_sqlite3.node` / `NODE_MODULE_VERSION` | [`ERROR_BETTER_SQLITE3_BINARY.md`](./ERROR_BETTER_SQLITE3_BINARY.md) |
| Import BD falla con `C:\app\data\gestion.db` (Windows) | [`ERROR_DATABASE_URL_WINDOWS_VS_DOCKER.md`](./ERROR_DATABASE_URL_WINDOWS_VS_DOCKER.md) |
| App levanta pero `database disk image is malformed` | [`ERROR_SQLITE_CORRUPT.md`](./ERROR_SQLITE_CORRUPT.md) |
| Warning migración Drizzle + fallback manual | [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) |
| Traducciones i18n faltantes | [`ERROR_TRANSLATION_NOT_FOUND.md`](./ERROR_TRANSLATION_NOT_FOUND.md) |

## Patrones UI

| Quiero... | Documento |
|---|---|
| Evitar que textos largos compriman columnas numéricas en tablas | [`UI_TABLAS_OVERFLOW.md`](./UI_TABLAS_OVERFLOW.md) |

## Expedientes (F1 / F2 / F3)

| Síntoma | Documento |
|---|---|
| Campo F2 se borra al guardar o al recargar expediente | [`F2_SYNC_PIPELINE.md`](./F2_SYNC_PIPELINE.md) |
| Lógica cuotas F1 → gastos/ingreso F3 | [`LOGICA_NEGOCIO_FORMAS_PAGO.md`](./LOGICA_NEGOCIO_FORMAS_PAGO.md) |
| Integridad store vs BD expedientes | [`ARQUITECTURA_EXPEDIENTES_INTEGRIDAD.md`](./ARQUITECTURA_EXPEDIENTES_INTEGRIDAD.md) |

## Estado de documentos

- Activos y recomendados: `DATABASE_SCHEMA`, `WORKFLOW_DB_TS_DATASOURCE`, `AUDITORIA_FUENTE_VERDAD`, `WORKFLOW_UI_VERIFICATION`, `DEPLOY`, `API_CONTRACT`, `ERROR_BETTER_SQLITE3_BINARY`, `ERROR_DATABASE_URL_WINDOWS_VS_DOCKER`, `ERROR_SQLITE_CORRUPT`, `UI_TABLAS_OVERFLOW`.
- Historicos: `RESUMEN_MODIFICACIONES_FEATURE2`, `WORKFLOW_DB_CHANGELOG` (bitacora manual opcional).
- Con partes legacy: `WORKFLOW_NEW_TABLE_WITH_RELATION`, `WORKFLOW_RENAME_TABLE` (mantener el orden de capas, pero ejecutar migraciones con Drizzle segun `DATABASE_SCHEMA`).
