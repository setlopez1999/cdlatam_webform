# FINAL — Plan de Migración CD-LATAM SGA

> **Repositorios:**
> - SGA: [https://github.com/setlopez1999/cdlatam_webform](https://github.com/setlopez1999/cdlatam_webform)
> - Landing CD-LATAM: [https://gitlab.com/groupalnNet/cd-latam](https://gitlab.com/groupalnNet/cd-latam)

## Objetivo

Migrar CD-LATAM SGA de SQLite monolitico a arquitectura profesional: PostgreSQL + Front/Back separados + Nginx + Docker, conviviendo con landing corporativo en un mismo VPS.

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

## 11. POSIBLES MEJORAS FUTURAS

- [ ] CI/CD con GitHub Actions (build + test + deploy automático)
- [ ] Backup automático diario de PostgreSQL a S3/Nextcloud
- [ ] Certbot automático para renovar SSL
- [ ] Monitoreo con Uptime Kuma
- [ ] Rate limiting por IP en Nginx para `/sga/api/`
- [ ] WAF básico (fail2ban + ModSecurity)
- [ ] Migrar a tipos de datos más estrictos en PostgreSQL (ENUMs, FKs reales)
