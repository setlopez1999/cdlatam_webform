# server/routes — Arquitectura de Rutas del Backend

## ¿Cómo funciona el backend?

Este proyecto usa **tRPC** como capa de comunicación entre frontend y backend.
tRPC es equivalente a REST pero con tipado de extremo a extremo (TypeScript).

```
Frontend (React)          Backend (Express + tRPC)
─────────────────         ──────────────────────────────────────
trpc.actas.list           → server/routers.ts → dataSource.ts → db.ts → SQLite
trpc.localAuth.login      → server/routers.ts → dataSource.ts → localAuth.ts → SQLite
trpc.catalogsDB.summary   → server/routers.ts → dataSource.ts → db.ts → SQLite
```

## Estructura del Backend

```
server/
├── _core/                  ← Framework (NO editar)
│   ├── index.ts            ← Punto de entrada Express
│   ├── context.ts          ← Construye ctx.user en cada request
│   ├── trpc.ts             ← Definición de publicProcedure / protectedProcedure
│   ├── vite.ts             ← Inyecta window.__ENV__ en el HTML (APP_DEBUG, etc.)
│   └── env.ts              ← Variables de entorno
│
├── routes/                 ← (Este directorio) Documentación de rutas
│   └── README.md
│
├── controllers/            ← Lógica de negocio separada
│   ├── actasController.ts       ← CRUD + validaciones de Actas
│   └── evaluacionesController.ts ← CRUD + cálculo automático F3
│
├── models/                 ← Tipos de dominio del negocio
│   └── index.ts
│
├── middleware/             ← Middleware Express reutilizable
│   └── auth.ts             ← requireAuth, requireAdmin
│
├── routers.ts              ← Punto de entrada tRPC (equivalente a routes REST)
│                              SIEMPRE importa desde dataSource.ts, nunca desde db.ts
├── dataSource.ts           ← Capa de abstracción (fuente de verdad única)
│                              Switch SQLite/API externa via USE_API en .env
├── localAuth.ts            ← Lógica de autenticación (bcrypt + JWT)
├── db.ts                   ← Queries directas a SQLite (solo acceder via dataSource.ts)
└── storage.ts              ← Helpers de S3
```

## Endpoints tRPC disponibles

### Autenticación (`localAuth.*`)
| Endpoint | Tipo | Acceso | Descripción |
|---|---|---|---|
| `localAuth.login` | mutation | público | Login con username/password |
| `localAuth.logout` | mutation | público | Cierra sesión (limpia cookie) |
| `localAuth.me` | query | público | Usuario actual (null si no auth) |
| `localAuth.listUsers` | query | admin | Lista todos los usuarios |
| `localAuth.createUser` | mutation | admin | Crea nuevo usuario |
| `localAuth.toggleUser` | mutation | admin | Activa/desactiva usuario |
| `localAuth.updateUser` | mutation | admin | Edita displayName y roleId |
| `localAuth.deleteUser` | mutation | admin | Elimina un usuario |

### Roles (`roles.*`)
| Endpoint | Tipo | Acceso | Descripción |
|---|---|---|---|
| `roles.list` | query | admin | Lista todos los roles |
| `roles.create` | mutation | admin | Crea nuevo rol |
| `roles.update` | mutation | admin | Edita nombre/descripción de rol |
| `roles.delete` | mutation | admin | Elimina rol (con validación de usuarios asignados) |

### Actas (`actas.*`)
| Endpoint | Tipo | Acceso | Descripción |
|---|---|---|---|
| `actas.list` | query | auth | Lista actas (admin: todas, user: propias) |
| `actas.create` | mutation | auth | Crea nueva Acta |
| `actas.delete` | mutation | admin | Elimina un Acta |

### Evaluaciones (`evaluaciones.*`)
| Endpoint | Tipo | Acceso | Descripción |
|---|---|---|---|
| `evaluaciones.list` | query | auth | Lista EPs (admin: todas, user: propias) |
| `evaluaciones.create` | mutation | auth | Crea nueva EP |
| `evaluaciones.delete` | mutation | admin | Elimina una EP |

### Catálogos (`catalogs.*`, `catalogsDB.*`)
| Endpoint | Tipo | Acceso | Descripción |
|---|---|---|---|
| `catalogs.all` | query | público | Todos los catálogos para dropdowns |
| `catalogsDB.summary` | query | auth | Catálogos desde SQLite con conteos |
| `catalogsDB.cecosByEmpresa` | query | auth | CECOs agrupados por empresa |
| `catalogsDB.search` | query | auth | Búsqueda en catálogos |

## Control de acceso por rol

```
Admin  → Acceso total: Dashboard, Acta, EP, Resultado, Base de Datos, Usuarios
Usuario → Solo: Acta (propias), EP (propias)
```

El rol se almacena en la tabla `users.role` (string legacy: "admin" | "user") y en
`users.roleId` como FK blanda a la tabla `roles`.
Al hacer login, el rol se incluye en el JWT y se verifica en cada request.

## Base de datos

La aplicación usa **SQLite** (archivo `data/gestion.db`).
El ORM es **Drizzle**. El schema canónico está en `drizzle/schema.ts`.

Tablas principales:
- `users` — Usuarios del sistema (username/password, bcrypt)
- `roles` — Roles relacionales con nombre y descripción
- `actas` — Actas de servicio
- `evaluaciones` — Evaluaciones de proyecto (EP)
- `catalog_meta` — Metadatos de catálogos (fijos + dinámicos)
- `catalog_custom_*` — Tablas de catálogos dinámicos creados por el usuario

## Despliegue en servidor propio (Docker)

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd cdlatam_webform

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con JWT_SECRET, COOKIE_SECRET, APP_DEBUG, etc.

# 3. Construir y levantar
docker-compose up --build -d

# Para cambios solo de .env (sin rebuild):
docker-compose down && docker-compose up -d

# Para cambios de código (requiere rebuild):
docker-compose down && docker-compose up --build -d
```

## Variables de entorno requeridas

```env
DATABASE_URL=./data/gestion.db
JWT_SECRET=tu-secreto-muy-largo-y-seguro
COOKIE_SECRET=otro-secreto-largo
NODE_ENV=production
PORT=3000
APP_DEBUG=false
USE_API=false
```
