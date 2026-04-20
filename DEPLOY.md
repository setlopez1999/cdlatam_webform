# Guia de Despliegue en Servidor (Docker)

Esta guia explica como actualizar el sistema en el servidor de produccion despues de hacer cambios en el repositorio.

> **Regla de oro:** despues de cualquier `git pull`, **siempre** hay que hacer `docker-compose up --build -d`.
> Sin `--build`, Docker reutiliza la imagen anterior y el codigo nuevo **no se aplica**, causando errores como `function is not defined`.

---

## 1. Conectarse al servidor

```bash
ssh usuario@tu-servidor
```

---

## 2. Actualizar el codigo

La rama principal de produccion es `dev_manus`. Asegurate de estar en ella:

```bash
cd /ruta/a/tu/proyecto/cdlatam_webform

git checkout dev_manus
git pull origin dev_manus
```

---

## 3. Verificar el archivo `.env`

El `.env` **no se sube al repositorio** (esta en `.gitignore`), por lo que debes crearlo o actualizarlo manualmente en el servidor. Debe tener al menos estas variables:

```env
NODE_ENV=production
DATABASE_URL=file:./data/gestion.db
JWT_SECRET=cambia_esto_por_una_clave_segura
COOKIE_SECRET=cambia_esto_por_otra_clave_segura

# false = SQLite local (default) | true = API externa
USE_API=false
API_URL=

# false en produccion (oculta errores tecnicos a usuarios)
APP_DEBUG=false
```

> Para cambiar `APP_DEBUG` o `USE_API` **no necesitas reconstruir**, solo reiniciar:
> ```bash
> docker-compose restart web
> ```

---

## 4. Reconstruir y levantar Docker

**Siempre usar `--build`** despues de un `git pull`:

```bash
docker-compose down
docker-compose up --build -d
```

---

## 5. Verificar que todo funciona

```bash
docker-compose logs -f web
```

Deberias ver:

```
[DB] Conectando a base de datos en: ./data/gestion.db
[DB] users schema v2 detected — no migration needed
[DB] Migrations applied successfully
Server running on http://0.0.0.0:3000/
```

> **Primera vez con BD antigua (schema OAuth):** el servidor detecta y migra automaticamente la tabla `users` al arrancar. No se necesita ningun paso manual. Ver `docs/WORKFLOW_AUTO_MIGRATION_USERS_V2.md` para detalle.

---

## Resumen rapido (flujo habitual)

```bash
git checkout dev_manus
git pull origin dev_manus
docker-compose down
docker-compose up --build -d
docker-compose logs -f web
```

---

## Cuando NO necesito `--build`

Solo cuando cambias variables en el `.env` sin tocar codigo:

```bash
nano .env
docker-compose restart web
```

---

## Archivos que NO se suben al repositorio

| Archivo | Motivo |
|---|---|
| `.env` | Contiene secretos - crealo manualmente en el servidor |
| `data/*.db` | Base de datos SQLite - se persiste en el volumen `./data` |
| `dist/` | Compilado - se genera con `npm run build` dentro del Docker |
| `node_modules/` | Dependencias - se instalan dentro del Docker |
