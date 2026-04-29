# Flujo de Trabajo: Verificación de Cambios en la UI

Este documento describe el proceso estándar para verificar que los cambios realizados en el frontend (React/Vite) se han compilado correctamente y funcionan como se espera en el navegador.

> **Importante:** Este proyecto tiene dos entornos de ejecución distintos. Los comandos de verificación difieren entre ellos.

---

## Entornos

| Entorno | Comando | Sistema |
|---|---|---|
| **Desarrollo local** | `npm run dev` | Windows (tu PC) |
| **Producción** | `docker-compose up --build -d` | Linux (servidor, via Docker) |

---

## Desarrollo Local (Windows + npm run dev)

### 1. Levantar el servidor

```powershell
npm run dev
```

El servidor levanta en `http://localhost:3000`. Tanto el backend (Express/tRPC) como el frontend (Vite HMR) corren juntos en el mismo proceso.

### 2. Verificar la compilación (HMR)

Después de guardar un archivo `.tsx` o `.ts`, Vite aplica el cambio en caliente (Hot Module Replacement).

Revisa el terminal donde corre `npm run dev`. Busca:
- ✅ Éxito: `[vite] (client) hmr update /src/pages/TuComponente.tsx`
- ❌ Error: `[vite] Internal server error` o mensajes de sintaxis TypeScript

Si hay error, corrige el código y guarda de nuevo.

### 3. Verificación visual en el navegador

1. Abre `http://localhost:3000`
2. Navega a la vista modificada
3. Prueba la interactividad (clicks, modales, formularios)
4. Abre DevTools (F12) → pestaña **Console**: busca errores de React, errores de red (404, 500) o excepciones JS

### 4. Verificación de tipos TypeScript

Antes de hacer commit, verifica que no hay errores de tipado:

```powershell
npx tsc --noEmit
```

Si no devuelve output → sin errores. Si muestra errores → corrígelos antes de continuar.

### 5. Flujo completo recomendado

1. Escribir código → guardar archivo
2. Verificar output del terminal (HMR sin errores)
3. Verificar visualmente en `http://localhost:3000`
4. Probar interactividad + revisar consola del navegador
5. Ejecutar `npx tsc --noEmit`
6. Hacer commit y push

---

## Producción (Docker + Linux)

### 1. Rebuild y levantar

```bash
docker-compose up --build -d
```

### 2. Ver logs del servidor

```bash
docker-compose logs -f web
```

Busca:
- `Server running on http://0.0.0.0:3000/` → ✅ arrancó correctamente
- `[DB] Conectando a base de datos en: /app/data/gestion.db` → ✅ BD correcta
- Cualquier error de migración o módulo faltante → ❌ revisar

### 3. Verificar que la BD usa el path correcto

En producción la BD debe estar en `/app/data/gestion.db` (mapeado al volumen `./data/` en el host).

```bash
docker-compose exec web ls /app/data/
# Debe mostrar: gestion.db
```

### 4. Rebuild completo (si hay cambios de dependencias)

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## Diferencias críticas entre entornos

| | Local (Windows) | Docker (Linux) |
|---|---|---|
| `DATABASE_URL` en `.env` | Ignorado (path Linux `/app/` no válido en Windows) | Usado (`/app/data/gestion.db`) |
| BD física | `<proyecto>/gestion.db` | `<proyecto>/data/gestion.db` (volumen) |
| Ver logs | Terminal de `npm run dev` | `docker-compose logs -f web` |
| Restart | Automático via `tsx watch` | `docker-compose restart web` |

> Ver también: `ERROR_DATABASE_URL_WINDOWS_VS_DOCKER.md` para el detalle del problema de path entre entornos.
