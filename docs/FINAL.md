# FINAL — Plan de Migración CD-LATAM SGA

> **Repositorios:**
> - SGA: [https://github.com/setlopez1999/cdlatam_webform](https://github.com/setlopez1999/cdlatam_webform)
> - Landing CD-LATAM: [https://gitlab.com/groupalnNet/cd-latam](https://gitlab.com/groupalnNet/cd-latam)

## Objetivo

Migrar CD-LATAM SGA de SQLite monolitico a arquitectura profesional: PostgreSQL + Front/Back separados + Nginx + Docker, conviviendo con landing corporativo en un mismo VPS.

---

## Estructura del proyecto SGA (cdlatam_webform)

```
cdlatam_webform/
├── client/                     # Frontend React (SPA)
│   ├── src/
│   │   ├── components/         # Componentes reutilizables
│   │   ├── features/           # Páginas por funcionalidad
│   │   │   └── expedientes/    # F1 (Actas), F2 (Evaluación), F3 (Resultados)
│   │   ├── hooks/              # useAuth, useSocket, etc.
│   │   ├── pages/              # Layouts y páginas principales
│   │   ├── lib/                # Utilidades, API client
│   │   └── shared/             # Tipos compartidos
│   └── index.html
├── server/                     # Backend Express + tRPC
│   ├── _core/                  # Núcleo: env, dbConfig, dbManagement
│   ├── routers.ts              # Rutas de API (tRPC y Express)
│   ├── db.ts                   # Acceso directo a SQLite (refactorizar a dataSource)
│   ├── dataSource.ts           # Puerto único de datos (wip)
│   ├── localAuth.ts            # Seeds de roles y usuarios
│   └── schemaBootstrap.ts      # Creación de tablas
├── drizzle/                    # Schema Drizzle ORM
│   └── schema.ts
├── docs/
│   └── FINAL.md               ← ESTE DOCUMENTO
├── .env                        # Variables de entorno (NO versionar en prod)
└── package.json                # Monorepo con workspaces
```

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + tRPC client |
| Backend | Node.js 20 + Express 5 + TypeScript + tRPC server |
| ORM | Drizzle ORM (dialecto SQLite local / PostgreSQL prod) |
| Base de datos | SQLite (dev/local) → PostgreSQL 16 (producción) |
| Autenticación | JWT + httpOnly cookies + bcrypt |
| Proxy reverso | Nginx (alpine) |
| Contenedores | Docker + Docker Compose |
| Build | Turborepo / npm workspaces (monorepo) |
| Repositorios | GitHub (SGA) + GitLab (landing corporativo) |

---

## Estado actual vs Estado deseado

| Aspecto | Actual | Deseado |
|---------|--------|---------|
| Base de datos | SQLite (`gestion.db`) | PostgreSQL 16 |
| Frontend | Sirve desde Express (`/siga/`) | Build estático servido por Nginx (`/sga/`) |
| Landing | No existe o separado | Mismo VPS, ruta raíz `/` |
| Despliegue | Manual, proceso frágil | Docker Compose, reproducible |
| Acceso a datos | `db.ts` + `dataSource.ts` mezclados | Solo `dataSource.ts` como puerta única |
| Seguridad | Passwords débiles, import/BD sin role check | Secrets fuertes, todo con middleware de roles |
| Nombre ruta | `/siga/` (hardcodeado) | `/sga/` (configurable, documentado con `[DOMINIO]`) |

---

## 1. PRERREQUISITO OBLIGATORIO — REFACTOR dataSource.ts

Antes de tocar PostgreSQL, refactorizar el acceso a datos para que `server/dataSource.ts` sea el **ÚNICO punto de entrada**.

### Situación actual

```
routers.ts
  ├── import { getActas, ... } from "./db"           → SQLite directo
  └── import { ds_getCatalogList, ... } from "./dataSource"  → dataSource (también SQLite)
```

### Objetivo

```
routers.ts
  └── import { ds_getActas, ds_getCatalogList, ... } from "./dataSource"
         │
         └── dataSource.ts (única puerta)
                ├── SQLite (local/dev)
                └── PostgreSQL (producción)
```

### Pasos

1. Mover todas las funciones de `db.ts` a las que llama `routers.ts` hacia `dataSource.ts`
2. Crear wrappers `ds_*` para cada función faltante
3. Actualizar `routers.ts` para importar solo de `dataSource.ts`
4. Verificar que la app funciona igual (debe ser transparente)

### Criterio de éxito

Ningún `import` en `routers.ts` apunta a `db.ts`. Todo pasa por `dataSource.ts`.

---

## 2. ARQUITECTURA FINAL — Servidor Único

### Estructura de URLs

| Ruta | Contenido | BD | Tipo |
|------|-----------|:--:|------|
| `[DOMINIO]/` | Landing corporativo | ❌ | HTML/CSS/JS estático |
| `[DOMINIO]/sga/` | SPA React (gestión) | ❌ | Build Vite |
| `[DOMINIO]/sga/api/` | API tRPC + Express | ✅ | Node.js |
| `[DOMINIO]/sga/api/...` | PostgreSQL | ✅ | Puerto 5432 |

### Diagrama

```
VPS Único
│
├── Nginx (proxy reverso, 80/443)
│   ├── [DOMINIO]/                     → /var/www/landing/       (estático)
│   ├── [DOMINIO]/sga/                 → /var/www/sga/dist/      (SPA)
│   └── [DOMINIO]/sga/api/             → localhost:3000          (proxy_pass)
│
├── Backend (Node.js + Express + tRPC) → Puerto 3000
│   └── dataSource.ts
│         ├── DEV  → SQLite (./gestion.db)
│         └── PROD → PostgreSQL (localhost:5432)
│
└── PostgreSQL 16                      → Puerto 5432
      └── Base: sga
```

---

## 3. DRIVER SWITCH — SQLite local / PostgreSQL producción

### Mecanismo

En `dataSource.ts`, según `DATABASE_URL`:

```typescript
if (DATABASE_URL.startsWith("postgres")) {
  // Usar drizzle(pg) + driver postgres
} else {
  // Usar drizzle(better-sqlite3) + driver SQLite (default)
}
```

### .env ejemplo

```env
# Local/dev
DATABASE_URL=file:./gestion.db

# Producción
DATABASE_URL=postgres://sga:password@localhost:5432/sga
```

### Drizzle ORM

Mismo schema, distinto dialecto:

```bash
# SQLite
drizzle-kit generate --dialect sqlite

# PostgreSQL
drizzle-kit generate --dialect pg
```

---

## 4. MIGRACIÓN DE DATOS SQLite → PostgreSQL

### Opción recomendada: pgloader

```bash
pgloader gestion.db postgresql://sga:password@localhost:5432/sga
```

Ventajas:
- Una sola línea
- Mapea tipos automáticamente
- Mantiene IDs originales (integridad referencial)
- Rápido

### Opción alternativa: Script Node

```typescript
// scripts/migrate-sqlite-to-pg.ts
// 1. Leer de SQLite con better-sqlite3
// 2. Transformar tipos
// 3. Escribir en PostgreSQL con drizzle pg
```

### Verificación post-migración

- Contar registros en ambas BD y comparar
- Verificar expedientes, actas, evaluaciones, usuarios
- Probar login con admin

---

## 5. DOCKER COMPOSE

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./landing:/var/www/landing
      - ./client/dist:/var/www/sga/dist
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - sga

  sga:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgres://sga:password@postgres:5432/sga
      - JWT_SECRET=${JWT_SECRET}
      - DEFAULT_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD}
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: sga
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: sga
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sga"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

---

## 6. NGINX — Configuración Template

Reemplazar `[DOMINIO]` por el dominio real en cada deploy.

```nginx
server {
    listen 80;
    server_name [DOMINIO] www.[DOMINIO];
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name [DOMINIO] www.[DOMINIO];

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    location / {
        root /var/www/landing;
        try_files $uri $uri/ =404;
    }

    location /sga/ {
        root /var/www/sga/dist;
        try_files $uri $uri/ /sga/index.html;
    }

    location /sga/api/ {
        proxy_pass http://sga:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 7. DEPLOY DESDE 0 EN VPS NUEVO

### Requisitos

- Docker + Docker Compose
- Git
- Dominio apuntando al VPS (DNS tipo A)
- Puertos 80 y 443 abiertos

### Pasos

```bash
# 1. Instalar dependencias
apt update && apt install -y docker docker-compose git

# 2. Clonar repos
git clone https://github.com/setlopez1999/cdlatam_webform /opt/sga
git clone https://gitlab.com/groupalnNet/cd-latam /opt/landing

# 3. Configurar .env
cd /opt/sga
cp .env.example .env
nano .env
# Editar: DB_PASSWORD, JWT_SECRET, DEFAULT_ADMIN_PASSWORD, DOMINIO

# 4. SSL (certbot o manual)
mkdir -p ssl
# Copiar fullchain.pem y privkey.pem

# 5. Build frontend
cd client && npm install && npm run build && cd ..

# 6. Copiar landing
cp -r /opt/landing/* ./landing/

# 7. Levantar
docker-compose up --build -d

# 8. Migrar datos (si vienes de SQLite)
docker-compose exec sga npx tsx scripts/migrate-sqlite-to-pg.ts

# 9. Verificar
docker-compose ps
docker-compose logs sga --tail 20
```

### Personalización por VPS

| Variable | Dónde se configura | Ejemplo |
|----------|-------------------|---------|
| `[DOMINIO]` | `nginx/conf.d/default.conf` + `.env` | `cd-latam.com` |
| SSL | `ssl/fullchain.pem` + `ssl/privkey.pem` | Certbot o manual |
| `DB_PASSWORD` | `.env` | Generar con `openssl rand -hex 16` |
| `JWT_SECRET` | `.env` | Generar con `openssl rand -hex 32` |

---

## 8. FLUJO DE ACTUALIZACIÓN

### Cambios ligeros (solo frontend)

Sin tiempo de inactividad.

```bash
cd client && npm install && npm run build
docker-compose restart nginx
```

Tiempo: ~1 minuto. Afecta solo UI.

### Cambios medios (solo backend, sin BD)

Sin tiempo de inactividad.

```bash
git pull origin main
docker-compose up --build -d sga
```

Tiempo: ~2 minutos.

### Cambios pesados (con migraciones de BD)

Requiere ventana de mantenimiento. **Siempre hacer backup antes.**

```bash
# 0. Avisar a usuarios
# 1. Backup
docker-compose exec postgres pg_dump -U sga sga > backup_$(date +%Y%m%d_%H%M).sql

# 2. Bajar solo el backend
docker-compose stop sga

# 3. Aplicar migraciones
docker-compose run --rm sga npx drizzle-kit push

# 4. Verificar
docker-compose run --rm sga npx tsx scripts/verify-migration.ts

# 5. Subir
docker-compose up -d

# 6. Logs
docker-compose logs sga --tail 30
```

Tiempo de inactividad: ~3-5 minutos.

### Flujo local (desarrollo)

```bash
# Sin Docker, SQLite local
git pull
npm install
npm run dev
```

```bash
# Con Docker local (simula prod)
docker-compose down
git pull
docker-compose up --build -d
```

---

## 9. PERSISTENCIA DE DATOS Y BACKUPS

### Volumen Docker

```yaml
volumes:
  pgdata:  # PostgreSQL guarda aquí
```

Los datos persisten entre reinicios de contenedor. Solo se pierden si borras el volumen (`docker-compose down -v`).

### Backup programado (recomendación)

```bash
# /etc/cron.daily/sga-backup
#!/bin/bash
docker-compose exec -T postgres pg_dump -U sga sga | gzip > /backups/sga_$(date +%Y%m%d).sql.gz
rclone copy /backups/sga_*.sql.gz nextcloud:SGA/Backups/
```

### Restore

```bash
gunzip -c backup_20260101.sql.gz | docker-compose exec -T postgres psql -U sga sga
```

---

## 10. EVITAR ERRORES DE UNIQUE CONSTRAINT

### Problema común

Al modificar la BD manualmente y reiniciar el proyecto, los seeds o migraciones intentan insertar registros que ya existen, causando errores como:

```
SqliteError: ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint
SQLITE_ERROR: UNIQUE constraint failed: tabla.columna
```

### Soluciones aplicadas

1. **`INSERT OR IGNORE`** en lugar de `INSERT` directo — ignora duplicados sin error.
2. **`SELECT + INSERT`** como respaldo — verifica existencia antes de insertar.
3. **Índices UNIQUE** creados con `CREATE UNIQUE INDEX IF NOT EXISTS` — aseguran integridad sin depender de constraints de columna.
4. **Try/catch** en todos los seeds — si algo falla, no detiene el arranque.

### Regla de oro

Cualquier script que inserte datos al arrancar debe ser:
- **Idempotente**: ejecutarlo N veces da el mismo resultado
- **Tolerante**: si el registro ya existe, no falla, lo saltea
- **Con índice UNIQUE**: la BD protege contra duplicados aunque el código falle

---

## 11. SEEDS AL ARRANQUE — Comportamiento actual

### Roles (6 fijos)

| nombre | label |
|--------|-------|
| `admin` | Administrador |
| `user` | Usuario |
| `gestor_horarios` | Gestor de Horarios |
| `perfil_full` | Perfil Full |
| `perfil_ventas` | Perfil Ventas |
| `perfil_implementacion` | Perfil Implementacion |

Idempotente: si el rol ya existe, no lo crea de nuevo.

### Usuarios (1 fijo)

| username | password | displayName |
|----------|----------|-------------|
| `admin` | `DEFAULT_ADMIN_PASSWORD` del `.env` | Administrador |

Idempotente: si `admin` ya existe, lo deja intacto (no sobrescribe password ni datos).

### Catálogos fijos

Los 25+ catálogos (`catalog_preventas`, `catalog_gerencias`, etc.) se registran en `catalog_meta` al arrancar. Las tablas se crean vacías si no existen (solo estructura, sin datos semilla).

### Lo que NO tiene seed

- `catalog_preventas` — vacía, el usuario la llena desde la UI
- `catalog_gerencias` — vacía
- `catalog_consideraciones_comerciales` — solo desde import de BD
- `catalog_implementacion_items` — solo desde import de BD

---

## 12. EXPORT / IMPORT de BD desde la UI

### Ubicación actual

`BaseDatos.tsx` tiene un botón oculto (opacity-20, 16x16px en esquina inferior derecha) que despliega:

- **Exportar BD** → `GET /api/db/export` → descarga `gestion_backup.db`
- **Importar BD** → `POST /api/db/import` → sube un archivo `.db` y reemplaza la BD actual

### ¿Es profesional tenerlo en la UI?

| Aspecto | Evaluación |
|---------|-----------|
| Tener export/import como funcionalidad | ✅ Sí, es profesional (útil para backups manuales, migraciones, restauración rápida) |
| Botón oculto con opacity-20 | ❌ No profesional. Si es funcionalidad legítima, debe mostrarse con un botón normal (con icono y texto claro). Si no, debe protegerse con autenticación de admin, no con oscuridad. |
| Sin verificación de rol en server | ❌ Grave. Cualquier usuario que sepa la URL puede importar/exportar la BD. |
| Sobrescribe BD sin validación extra | ⚠️ El import reemplaza el archivo completo — debería pedir confirmación doble y hacer backup automático antes. |

### Decisión

**Mantener la funcionalidad** pero profesionalizarla:

1. **Server:** Agregar middleware de role check (`requireRole("admin")`) en `dbManagement.ts` para proteger ambas rutas.
2. **Frontend:** Mostrar el botón de forma visible (no oculto), pero solo renderizarlo si el usuario tiene rol admin.
3. **Seguridad:** Antes de importar, hacer un backup automático de la BD actual.
4. **UX:** Indicador de progreso en import (archivos grandes). Mensajes claros.

### Pendiente

- [ ] Agregar `requireRole("admin")` en `GET /api/db/export`
- [ ] Agregar `requireRole("admin")` en `POST /api/db/import`
- [ ] Hacer visible el botón de export/import solo para admin
- [ ] Backup automático pre-import

---

## 13. SEGURIDAD — Credenciales expuestas en Frontend

### Evaluación actual

| Riesgo | Estado | Acción |
|--------|--------|--------|
| Passwords hardcodeadas en JS | ✅ No existe | Ninguna |
| JWT visible para JS | ✅ No (httpOnly cookie) | Ninguna |
| `window.__ENV__` expone secrets | ✅ No, solo `APP_DEBUG` y `USE_API` (booleans) | Ninguna |
| API keys en bundle | ✅ No existe | Ninguna |
| Admin password en `.env` (server) | ⚠️ `1234` | Cambiar antes de producción |
| JWT_SECRET placeholder | ⚠️ `cambia_esto_...` | Generar uno real con `openssl rand -hex 32` |
| Import/Export sin role check | ❌ Cualquier usuario puede | Agregar middleware (sección 12) |

### Principio aplicado

**Zero trust en el frontend.** Todo lo que se envía al navegador es visible por F12. Por lo tanto:

1. **Nunca** poner secrets, tokens, passwords en código cliente.
2. **Nunca** confiar en la ocultación por CSS (opacity, display:none) como seguridad.
3. **Siempre** verificar permisos en el servidor, no en el cliente.
4. **Siempre** usar cookies httpOnly para sesión, no localStorage.

### Checklist de seguridad pre-producción

- [ ] Generar `JWT_SECRET` fuerte (`openssl rand -hex 32`)
- [ ] Generar `COOKIE_SECRET` fuerte (`openssl rand -hex 32`)
- [ ] Cambiar `DEFAULT_ADMIN_PASSWORD` (> 8 caracteres, con números y símbolos)
- [ ] Verificar que no hay secrets en `client/src/`
- [ ] Agregar role check en rutas de import/export
- [ ] Deshabilitar `APP_DEBUG` en producción (`.env` → `DEBUG=false`)

---

## 14. INFORMACIÓN REQUERIDA PARA EJECUTAR EL PLAN

### Credenciales de servidores

> **⚠️ CRÍTICO:** Estas credenciales están incluidas aquí para que la IA destino pueda ejecutar el plan automáticamente. **DEBEN rotarse (cambiarse) inmediatamente después del deploy** por seguridad.

| Recurso | Dato |
|---------|------|
| IP VPS | `173.212.250.43` |
| Puerto SSH | `22` |
| Usuario | `root` |
| Password | `0XYdUlIK0Zmb66KGq8V` |
| Landing repo | `https://gitlab.com/groupalnNet/cd-latam` |
| SGA repo | `https://github.com/setlopez1999/cdlatam_webform` |
| Dominio | `cd-latam.com` / por confirmar |
| SSL | Pendiente (Certbot o manual) |

> ⚠️ **POST-DEPLOY:** Cambiar password root, rotar JWT_SECRET, COOKIE_SECRET, DEFAULT_ADMIN_PASSWORD. No dejar secrets por defecto.

### Preguntas que quien ejecute el plan debe responder

- [ ] ¿El dominio `cd-latam.com` apunta al VPS `173.212.250.43` o se usará otro dominio?
- [ ] ¿El landing está en el repo de GitLab listo para copiar o necesita build?
- [ ] ¿Se mantiene SQLite en local/dev o se fuerza PostgreSQL también en dev?
- [ ] ¿Quién genera el SSL? ¿Certbot automático o certificado manual?
- [ ] ¿Los backups de BD van a Nextcloud, S3, o disco local?

---

## 15. DATOS QUE DEBEN PERSISTIR (preservación, no importación)

Este plan **no** es sobre importar datos nuevos. Es sobre **preservar los datos existentes** durante la migración. Las tablas críticas son:

### Datos transaccionales (deben persistir siempre)

| Tabla | Contenido | Prioridad |
|-------|-----------|:---------:|
| `expedientes` | Expedientes creados | 🔴 Crítica |
| `actas` | Formulario F1 (Acta de Aceptación) | 🔴 Crítica |
| `evaluaciones` | Formulario F2 (Evaluación de Proyecto) | 🔴 Crítica |
| `resultados_expediente` | Formulario F3 (Resultados calculados) | 🔴 Crítica |
| `implementaciones` | Checklist de implementación | 🟡 Alta |
| `audit_log` | Registro de auditoría | 🟡 Alta |
| `catalog_clausulas` | PDFs de cláusulas legales | 🟡 Alta |

### Datos maestros (deben persistir)

| Tabla | Contenido | Prioridad |
|-------|-----------|:---------:|
| `users` + `user_roles` | Usuarios y roles asignados | 🔴 Crítica |
| `roles` | Roles del sistema | 🔴 Crítica |
| `catalog_preventas` | Valores de preventa (si tiene datos) | 🟡 Alta |
| `catalog_consideraciones_comerciales` | Consideraciones comerciales (si tiene datos) | 🟢 Media |
| `catalog_implementacion_items` | Items de implementación (si tiene datos) | 🟢 Media |

### Lo que se puede regenerar

| Tabla | Motivo |
|-------|--------|
| `catalog_meta` | Se regenera con `seedCatalogMeta()` al arrancar |
| `catalog_monedas`, `catalog_paises`, etc. | Catálogos base vacíos, se llenan desde UI o import |
| Cláusulas PDF en `data/clauses/` | Archivos físicos, no están en la BD |

### Regla de oro para la migración

1. **Hacer backup completo del archivo `gestion.db`** antes de cualquier cambio.
2. **Verificar integridad**: contar registros en cada tabla crítica antes y después.
3. **No tocar datos transaccionales**: migrar tal cual, sin transformaciones.
4. **Preservar IDs**: los IDs de expedientes, actas, usuarios deben mantenerse (hay referencias cruzadas).
5. **Preservar archivos**: cláusulas PDF, firmas, uploads en `data/`.

---

## 16. POSIBLES MEJORAS FUTURAS

- [ ] CI/CD con GitHub Actions (build + test + deploy automático)
- [ ] Backup automático diario de PostgreSQL a S3/Nextcloud
- [ ] Certbot automático para renovar SSL
- [ ] Monitoreo con Uptime Kuma
- [ ] Rate limiting por IP en Nginx para `/sga/api/`
- [ ] WAF básico (fail2ban + ModSecurity)
- [ ] Migrar a tipos de datos más estrictos en PostgreSQL (ENUMs, FKs reales)
