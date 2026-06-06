# Error: Base de datos SQLite corrupta (`database disk image is malformed`)

Este documento cubre el error `SQLITE_CORRUPT` que aparece cuando el archivo `gestion.db` queda ilegible, especialmente tras importar una BD desde la UI de administración.

## 1. Síntoma del error

El servidor **puede arrancar** (`Server running on http://localhost:3000/`), pero al usar ciertas pantallas (p. ej. Implementación) falla con:

```
[implementacion.listar] SQLite corrupta o ilegible: C:\...\cdlatam_webform\gestion.db
SqliteError: database disk image is malformed
code: 'SQLITE_CORRUPT'
```

En la UI el usuario ve un mensaje del tipo: *"La base de datos SQLite está dañada o ilegible. Restaurar desde un backup..."* (ver [`server/routers.ts`](../server/routers.ts)).

A veces los logs muestran justo antes:

```
[DB Mgmt] Receiving database import...
[DB Mgmt] Database imported successfully.
```

Es decir: el import **terminó sin error HTTP**, pero el archivo resultante no es válido para SQLite.

## 2. Causas habituales

| Causa | Detalle |
|---|---|
| Archivo de backup incompleto o truncado | Descarga interrumpida, copia parcial entre PCs |
| Import con conexión activa | [`server/_core/dbManagement.ts`](../server/_core/dbManagement.ts) sobrescribe `gestion.db` con `writeFileSync` mientras el servidor puede tener la BD abierta |
| Archivo que no es SQLite | Se subió un `.db` que en realidad es otro formato o está vacío |
| Mezcla de entornos | Backup de Docker (`data/gestion.db`) copiado sin parar el servidor local |

## 3. Ubicación del archivo según entorno

| Entorno | Ruta física de la BD |
|---|---|
| **Windows (`pnpm dev`)** | `<proyecto>/gestion.db` (raíz del repo) |
| **Docker (Linux)** | `/app/data/gestion.db` (volumen `./data/gestion.db` en el host) |

En desarrollo local Windows, `DATABASE_URL=file:/app/data/gestion.db` del `.env` **se ignora** (ver [`ERROR_DATABASE_URL_WINDOWS_VS_DOCKER.md`](./ERROR_DATABASE_URL_WINDOWS_VS_DOCKER.md)).

## 4. Soluciones

### Opción A — BD limpia (rápido, pierdes datos locales)

1. **Parar el servidor** (`Ctrl+C` en la terminal de `pnpm dev`).
2. Renombrar o borrar la BD dañada:

```powershell
Rename-Item gestion.db gestion.db.corrupto.backup
```

3. Volver a levantar:

```powershell
pnpm.cmd dev
```

Se crea una BD nueva con usuarios por defecto (`admin` / `1234`, `usuario` / `5678`).

### Opción B — Restaurar backup del trabajo o producción

1. Parar el servidor.
2. Copiar un `gestion.db` **que sepas que funciona** (export desde la UI, backup del servidor, o PC del trabajo).
3. Reemplazar `<proyecto>/gestion.db`.
4. `pnpm.cmd dev`.

**Recomendación:** exportar siempre con *Exportar BD* en la pantalla Base de Datos **antes** de importar otro archivo.

### Opción C — Reparar con sqlite3 CLI

Si tienes `sqlite3` instalado y quieres intentar recuperar datos:

```powershell
sqlite3 gestion.db ".recover" | sqlite3 gestion_recovered.db
Rename-Item gestion.db gestion.db.corrupto.backup
Rename-Item gestion_recovered.db gestion.db
pnpm.cmd dev
```

No garantiza recuperar todo; revisa que la app funcione antes de confiar en el archivo reparado.

## 5. Verificar si la BD está sana

Con el servidor **parado**:

```powershell
node -e "const D=require('better-sqlite3'); const db=new D('gestion.db'); console.log(db.pragma('integrity_check')); db.close();"
```

Debe mostrar `[ { integrity_check: 'ok' } ]`.

## 6. Prevención

- Parar `pnpm dev` antes de importar una BD manualmente (copiar archivo a mano).
- Usar solo backups exportados desde *Exportar BD* o copias completas del archivo.
- No mezclar archivos `.db` entre máquinas sin comprobar tamaño e integridad.
- Tras cambiar de versión de Node, reconstruir el nativo: ver [`ERROR_BETTER_SQLITE3_BINARY.md`](./ERROR_BETTER_SQLITE3_BINARY.md).

## 7. Documentos relacionados

- [`ERROR_BETTER_SQLITE3_BINARY.md`](./ERROR_BETTER_SQLITE3_BINARY.md) — error al **arrancar** (binario nativo).
- [`ERROR_DATABASE_URL_WINDOWS_VS_DOCKER.md`](./ERROR_DATABASE_URL_WINDOWS_VS_DOCKER.md) — error al **importar** por path `C:\app\data\`.
- [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) — warning *Migration via Drizzle failed, applying schema manually* (fallback normal, no es corrupción).
