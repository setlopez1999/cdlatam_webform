# Error: DATABASE_URL con path Linux en entorno Windows

## Contexto del Proyecto

Este proyecto tiene **dos entornos de ejecución**:

| Entorno | Sistema | Comando |
|---|---|---|
| **Desarrollo local** | Windows | `npm run dev` |
| **Producción** | Linux (contenedor Docker) | `docker-compose up --build -d` |

El `.env` tiene una sola `DATABASE_URL` configurada para Docker:

```env
DATABASE_URL=file:/app/data/gestion.db
```

Esto funciona perfecto en Docker pero genera un error en Windows.

---

## Síntoma del Error

Al intentar importar la base de datos desde la UI (o cualquier operación de `dbManagement.ts`), el servidor lanza:

```
[DB Mgmt] Error importing database: Error: ENOENT: no such file or directory, open 'C:\app\data\gestion.db'
    at Object.openSync (node:fs:560:18)
    at writeFileSync (node:fs:2451:35)
    at <anonymous> (server\_core\dbManagement.ts:45:7)
```

---

## Causa Raíz

### ¿Por qué `C:\app\data\gestion.db`?

Node.js en Windows interpreta el path Linux `/app/data/gestion.db` como una ruta relativa a la raíz del drive actual → `C:\app\data\gestion.db`. Esa carpeta no existe en Windows.

### ¿Por qué fallaba en `dbManagement.ts` pero no en `db.ts`?

Ambos archivos tenían la misma lógica defensiva, pero **duplicada**. Cuando se agregó una nueva ruta (import/export) a `dbManagement.ts`, olvidaron copiar el mismo check que ya existía en `db.ts`.

### Resumen visual

```
.env: DATABASE_URL=file:/app/data/gestion.db
           │
           ├─ Docker (Linux)  → /app/data/gestion.db         ✅ válido (volumen montado)
           │
           └─ Windows npm dev → C:\app\data\gestion.db       ❌ no existe
                                     ↑
                              Sin el check, Node interpreta /app/ como C:\app\
```

---

## Solución Aplicada

Se creó **`server/_core/dbConfig.ts`** como fuente única de verdad para resolver la ruta de la BD:

```ts
import { join, dirname } from "path";
import { existsSync, mkdirSync } from "fs";

export function resolveDbPath(): string {
  const LOCAL_DB_PATH = join(process.cwd(), "gestion.db");
  if (!process.env.DATABASE_URL) return LOCAL_DB_PATH;

  const envPath = process.env.DATABASE_URL.replace(/^file:/, "");
  const isLinuxPathOnWindows =
    process.platform === "win32" && envPath.startsWith("/app/");

  if (!isLinuxPathOnWindows) {
    const dbDir = dirname(envPath);
    if (!existsSync(dbDir)) {
      try { mkdirSync(dbDir, { recursive: true }); } catch {
        console.warn(`[DB] No se pudo crear ${dbDir}, usando fallback local.`);
        return LOCAL_DB_PATH;
      }
    }
    return envPath;
  }
  return LOCAL_DB_PATH;
}
```

`server/db.ts` y `server/_core/dbManagement.ts` importan `resolveDbPath()` desde este módulo compartido, eliminando duplicación y garantizando consistencia.

**Resultado:**
- **Windows (`npm run dev`):** ignora `DATABASE_URL`, usa `<proyecto>/gestion.db` ✅
- **Docker (Linux):** usa `/app/data/gestion.db` (mapeado al volumen `./data/`) ✅

---

## Regla General

> Cualquier archivo del servidor que necesite la ruta de la BD **debe** usar `resolveDbPath()` desde `server/_core/dbConfig.ts`. No duplicar lógica inline.

### Uso correcto

```ts
import { resolveDbPath } from "./dbConfig";
const dbPath = resolveDbPath();
```

---

## Archivos Afectados

| Archivo | Estado |
|---|---|
| `server/_core/dbConfig.ts` | ✅ Creado — fuente única de verdad |
| `server/db.ts` | ✅ Refactorizado para usar `dbConfig` |
| `server/_core/dbManagement.ts` | ✅ Refactorizado para usar `dbConfig` |
