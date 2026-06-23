# SGA CDLatam — Sistema de Gestión Administrativa

Este repositorio contiene el código fuente del **SGA CDLatam** (ERP) y la configuración de despliegue unificada para el **Landing Corporativo** y el **SGA** bajo el dominio `cd-latam.com`.

## 1. Arquitectura del Sistema

El sistema utiliza una arquitectura profesional basada en contenedores Docker, unificando dos proyectos distintos bajo un mismo dominio mediante Nginx.

### 1.1. Componentes (VPS Único)

| Componente | Tecnología | Función |
| :--- | :--- | :--- |
| **Proxy Inverso** | Nginx | Enruta el tráfico por URL, sirve el Landing estático y maneja SSL. |
| **Landing** | React (Vite) | Sitio web corporativo estático (compilado). |
| **SGA Frontend** | React (Vite) | Single Page Application (SPA) del ERP. |
| **SGA Backend** | Node.js + Express + tRPC | API del ERP, lógica de negocio y autenticación. |
| **Base de Datos** | PostgreSQL 16 | Motor de base de datos relacional para producción. |

### 1.2. Enrutamiento (Nginx)

Nginx expone los servicios en los puertos estándar HTTP (80) y HTTPS (443), eliminando la necesidad de usar puertos personalizados en las URLs.

*   `https://sga.cd-latam.com/` → **SGA Frontend** (Proxy al contenedor Node.js)
*   `https://sga.cd-latam.com/api/` → **SGA Backend** (Proxy al contenedor Node.js)

---

## 2. Base de Datos (PostgreSQL vs SQLite)

El sistema soporta dos motores de base de datos, seleccionados automáticamente según la variable `DATABASE_URL` en el archivo `.env`.

### 2.1. Producción (PostgreSQL)
*   **Uso:** Obligatorio en el VPS.
*   **Configuración:** `DATABASE_URL=postgresql://usuario:password@postgres:5432/sga_db`
*   **Ventajas:** Concurrencia real, tipos de datos estrictos, copias de seguridad en caliente (`pg_dump`).

### 2.2. Desarrollo Local (SQLite)
*   **Uso:** Para pruebas rápidas en la máquina del desarrollador sin levantar Docker.
*   **Configuración:** `DATABASE_URL=file:./gestion.db`
*   **Ventajas:** Cero configuración, archivo local único.

### 2.3. Cómo conectarse a la BD PostgreSQL (Producción)
Para administrar la base de datos directamente (ej. DBeaver, TablePlus, pgAdmin):
1.  Abre el puerto 5432 en el firewall del VPS (solo para tu IP, por seguridad).
2.  **Host:** `173.212.250.43` (IP del VPS)
3.  **Puerto:** `5432`
4.  **Usuario:** El valor de `POSTGRES_USER` en tu `.env`
5.  **Contraseña:** El valor de `POSTGRES_PASSWORD` en tu `.env`
6.  **Base de datos:** El valor de `POSTGRES_DB` en tu `.env`

---

## 3. Despliegue en VPS (Desde Cero)

Sigue estos pasos para instalar el sistema en un VPS nuevo (Ubuntu 24.04).

### 3.1. Preparación del Servidor
```bash
# 1. Actualizar sistema e instalar dependencias
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose git certbot npm

# 2. Instalar pnpm (requerido para compilar el landing)
sudo npm install -g pnpm
```

### 3.2. Clonar Repositorios
```bash
# 1. Clonar el SGA (este repositorio)
git clone https://github.com/setlopez1999/cdlatam_webform.git /opt/sga
cd /opt/sga
git checkout main-full

# 2. Clonar el Landing (requiere token de GitLab)
git clone https://oauth2:TU_TOKEN_AQUI@gitlab.com/groupalnNet/cd-latam.git /opt/landing
```

### 3.3. Compilar el Landing
```bash
cd /opt/landing
pnpm install
pnpm build
# El resultado quedará en /opt/landing/dist/public/
```

### 3.4. Configurar Variables de Entorno
```bash
cd /opt/sga
cp .env.example .env
nano .env
```
**IMPORTANTE:** Genera secretos fuertes para `JWT_SECRET`, `COOKIE_SECRET` y `POSTGRES_PASSWORD` usando `openssl rand -hex 32`. Reemplaza `[DOMINIO]` en `nginx/conf.d/default.conf` por tu dominio real (`cd-latam.com`).

### 3.5. Levantar Servicios
```bash
cd /opt/sga
# Dar permisos de ejecución a los scripts
chmod +x scripts/*.sh

# Levantar contenedores (PostgreSQL, Node.js, Nginx)
docker-compose up --build -d
```

### 3.6. Configurar SSL (Certbot)
Asegúrate de que el dominio ya apunte a la IP del VPS antes de ejecutar esto:
```bash
sudo certbot certonly --webroot -w /var/www/certbot -d sga.cd-latam.com
```
Una vez generados los certificados, configura las rutas en `nginx/conf.d/default.conf` y reinicia Nginx:
```bash
docker compose restart nginx
```

---

## 4. Mantenimiento y Actualización

### 4.1. Actualización sin cambios en BD
Frontend, backend, configuraciones — todo lo que no modifica tablas/columnas.

```bash
cd /opt/sga
git pull origin main-full
docker compose up --build -d sga
```

> Sin downtime. Nginx sigue sirviendo mientras se compila el nuevo contenedor.

### 4.2. Actualización con migraciones de BD
Cuando se agregan/modifican tablas, columnas o índices.

```bash
cd /opt/sga

# 1. Backup obligatorio
docker compose exec postgres pg_dump -U sga_user sga_db > backup_$(date +%Y%m%d_%H%M).sql

# 2. Pull + rebuild
git pull origin main-full
docker compose up --build -d sga

# 3. Verificar migraciones automáticas (se aplican al arranque)
docker compose logs sga --tail 20
```

> Downtime ~30s mientras se reinicia el contenedor.

### 4.3. Sólo cambios en Nginx (SSL, dominio, rutas)
Sin rebuild, solo restart.

```bash
cd /opt/sga
docker compose restart nginx
```

### 4.4. Ver estado del sistema

```bash
docker compose ps
docker compose logs sga --tail 10
```

---

## 5. Gestión de Datos y Backups

### 5.1. Exportar / Importar desde la Interfaz (SGA)
El sistema incluye una herramienta profesional de Export/Import en la interfaz web, accesible **solo para usuarios con rol de Administrador**.
*   **Exportar:** Descarga un archivo `.sql` (generado vía `pg_dump`) con toda la base de datos.
*   **Importar:** Restaura la base de datos desde un archivo `.sql` (vía `psql`).

### 5.2. Migración de SQLite a PostgreSQL
Si tienes datos en un archivo `gestion.db` antiguo y quieres pasarlos al nuevo PostgreSQL:
1.  Copia tu `gestion.db` a `/opt/sga/gestion.db`.
2.  Ejecuta el script de migración dentro del contenedor:
    ```bash
    docker exec -it sga_app npx tsx scripts/migrate-sqlite-to-pg.ts
    ```
    *El script es idempotente (seguro de ejecutar varias veces) y respeta las claves foráneas.*

### 5.3. Backups Automáticos (Recomendado)
Se recomienda configurar un `cron` en el VPS para ejecutar `pg_dump` diariamente y subir el resultado a un almacenamiento externo (ej. Nextcloud, S3) usando `rclone`.

---

## 6. Seguridad

*   **Contraseñas por defecto:** Cambia las contraseñas de los usuarios generados automáticamente en el primer inicio.
*   **Secretos:** Nunca subas el archivo `.env` al repositorio. El sistema fallará en producción si detecta que estás usando los secretos de ejemplo.
*   **RBAC:** El acceso a rutas críticas (como Export/Import) está protegido por el middleware `requireAdminMiddleware`, que verifica tanto el token JWT como el rol en la base de datos.
*   **Nginx:** La configuración incluye cabeceras de seguridad estrictas (HSTS, X-Frame-Options, X-XSS-Protection).

---

## 7. Variables de Entorno (`.env`)

Copia `.env.example` a `.env` y completa los valores. El sistema **no arranca** si los secretos son los de ejemplo.

| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `DATABASE_URL` | URL de conexión a la BD | `postgresql://sga_user:pass@postgres:5432/sga_db` |
| `JWT_SECRET` | Secreto para firmar tokens JWT (mín. 32 chars) | `openssl rand -hex 32` |
| `COOKIE_SECRET` | Secreto para firmar cookies de sesión | `openssl rand -hex 32` |
| `POSTGRES_USER` | Usuario de PostgreSQL | `sga_user` |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL | `openssl rand -hex 16` |
| `POSTGRES_DB` | Nombre de la base de datos | `sga_db` |
| `DEFAULT_ADMIN_PASSWORD` | Contraseña inicial del usuario admin | Cambiar tras primer login |
| `NODE_ENV` | Entorno de ejecución | `production` |
| `PORT` | Puerto interno del servidor Node.js | `3000` |

---

## 8. Notas Técnicas

### 8.1. Driver Switch SQLite / PostgreSQL

El sistema detecta automáticamente el motor de base de datos al arrancar:
- Si `DATABASE_URL` empieza con `postgresql://` → usa **PostgreSQL** con migraciones de `drizzle/migrations-pg/`
- Si `DATABASE_URL` empieza con `file:` o está vacía → usa **SQLite** con migraciones de `drizzle/migrations/`

### 8.2. Migraciones PostgreSQL

Las migraciones PG se generan con:
```bash
npx drizzle-kit generate --config=drizzle.config.pg.ts
```
El schema PG está en `drizzle/schema.pg.ts` y las migraciones en `drizzle/migrations-pg/`.

### 8.3. Build del Servidor

El servidor se compila con `esbuild`. Los imports de `vite` y `vite.config` son **dinámicos** (`await import()`) para que esbuild no los incluya en el bundle de producción (vite es solo una dependencia de desarrollo).

### 8.4. Catálogos Dinámicos

Las funciones de catálogos dinámicos (`catalog_custom_*`) usan `sql.raw()` de Drizzle ORM, compatible con PostgreSQL y SQLite.

### 8.5. Export/Import de BD

El endpoint de export/import está protegido con `requireAdminMiddleware`. Solo usuarios con rol `admin` pueden acceder. En modo PostgreSQL usa `pg_dump` / `psql`. En modo SQLite usa backup de archivo.

---

## 9. Estado del Deploy (VPS `173.212.250.43`)

| Servicio | Estado | URL |
| :--- | :--- | :--- |
| SGA | ✅ Funcionando | `https://sga.cd-latam.com/` |
| API | ✅ Funcionando | `https://sga.cd-latam.com/api/` |
| PostgreSQL | ✅ Healthy | Puerto 5432 (interno) |
| SSL (Let's Encrypt) | ✅ Activo | Certificado para `sga.cd-latam.com` |

**Credenciales iniciales del SGA:**
- Usuario: `admin`
- Contraseña: Ver `.env` en el VPS (`DEFAULT_ADMIN_PASSWORD`)
- **Cambiar inmediatamente tras el primer login.**
