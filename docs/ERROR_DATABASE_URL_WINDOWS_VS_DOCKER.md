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

### ¿Por qué `db.ts` funciona pero `dbManagement.ts` no?

**`server/db.ts`** tiene lógica defensiva:

```ts
const isLinuxPathOnWindows = process.platform === 'win32' && envPath.startsWith('/app/');
if (!isLinuxPathOnWindows) {
  dbPath = envPath; // Solo lo usa si es un path válido para el OS actual
}
// → En Windows: ignora DATABASE_URL y usa process.cwd()/gestion.db ✅
```

**`server/_core/dbManagement.ts`** (antes del fix) NO tenía ese check:

```ts
// ❌ Antes
const dbPath = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace(/^file:/, "")  // Usa el path ciegamente
  : join(process.cwd(), "gestion.db");
// → En Windows con DATABASE_URL=file:/app/data/gestion.db
// → dbPath = C:\app\data\gestion.db ← No existe
```

### Resumen visual

```
.env: DATABASE_URL=file:/app/data/gestion.db
           │
           ├─ Docker (Linux)  → /app/data/gestion.db         ✅ válido (volumen montado)
           │
           └─ Windows npm dev → C:\app\data\gestion.db       ❌ no existe
                                     ↑
                              db.ts lo evitaba, dbManagement.ts no
```

---

## Solución Aplicada

Se replicó en `dbManagement.ts` la misma lógica defensiva que ya existía en `db.ts`:

```ts
// server/_core/dbManagement.ts
const LOCAL_DB_PATH = join(process.cwd(), "gestion.db");
let dbPath = LOCAL_DB_PATH;
if (process.env.DATABASE_URL) {
  const envPath = process.env.DATABASE_URL.replace(/^file:/, "");
  const isLinuxPathOnWindows = process.platform === "win32" && envPath.startsWith("/app/");
  if (!isLinuxPathOnWindows) {
    dbPath = envPath;
  }
}
```

**Resultado:**
- **Windows (`npm run dev`):** ignora `DATABASE_URL`, usa `<proyecto>/gestion.db` ✅
- **Docker (Linux):** usa `/app/data/gestion.db` (mapeado al volumen `./data/`) ✅

---

## Regla General

> Cualquier archivo del servidor que resuelva un path de base de datos desde `DATABASE_URL` **debe** incluir el check de `isLinuxPathOnWindows` para ser compatible con ambos entornos.

### Plantilla reutilizable

```ts
import { join } from "path";

const LOCAL_DB_PATH = join(process.cwd(), "gestion.db");
let dbPath = LOCAL_DB_PATH;

if (process.env.DATABASE_URL) {
  const envPath = process.env.DATABASE_URL.replace(/^file:/, "");
  const isLinuxPathOnWindows = process.platform === "win32" && envPath.startsWith("/app/");
  if (!isLinuxPathOnWindows) {
    dbPath = envPath;
  }
}
```

---

## Archivos Afectados

| Archivo | Estado |
|---|---|
| `server/db.ts` | ✅ Tenía el check — BD principal, siempre funcionó |
| `server/_core/dbManagement.ts` | ✅ Corregido en Abril 2026 — rutas import/export |
