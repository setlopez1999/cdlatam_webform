# server/routes — Arquitectura de Rutas del Backend

## ¿Cómo funciona el backend?

Este proyecto usa **tRPC** como capa de comunicación entre frontend y backend.
tRPC es equivalente a REST pero con tipado de extremo a extremo (TypeScript).

```
Frontend (React)          Backend (Express + tRPC)
─────────────────         ──────────────────────────────────────
trpc.actas.list           → server/routers.ts → actasController.ts → db.ts → MySQL
trpc.localAuth.login      → server/routers.ts → localAuth.ts → MySQL
trpc.catalogsDB.summary   → server/routers.ts → db.ts → MySQL
```

## Estructura del Backend

```
server/
├── _core/                  ← Framework (NO editar)
│   ├── index.ts            ← Punto de entrada Express
│   ├── context.ts          ← Construye ctx.user en cada request
│   ├── trpc.ts             ← Definición de publicProcedure / protectedProcedure
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
├── localAuth.ts            ← Lógica de autenticación (bcrypt + JWT)
├── db.ts                   ← Helpers de queries a la base de datos
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
| `catalogsDB.summary` | query | auth | Catálogos desde MySQL con conteos |
| `catalogsDB.cecosByEmpresa` | query | auth | CECOs agrupados por empresa |
| `catalogsDB.search` | query | auth | Búsqueda en catálogos |

## Control de acceso por rol

```
Admin  → Acceso total: Dashboard, Acta, EP, Resultado, Base de Datos, Usuarios
Usuario → Solo: Acta (propias), EP (propias)
```

El rol se almacena en la tabla `localUsers.role` (enum: "admin" | "user").
Al hacer login, el rol se incluye en el JWT y se verifica en cada request.

## Despliegue en servidor propio

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd gestion_administrativa

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con DATABASE_URL y JWT_SECRET

# 4. Ejecutar migraciones
pnpm db:push

# 5. Compilar para producción
pnpm build

# 6. Iniciar servidor
pnpm start
# → Servidor corriendo en http://localhost:3000
```

## Variables de entorno requeridas

```env
DATABASE_URL=mysql://user:password@host:3306/database
JWT_SECRET=tu-secreto-muy-largo-y-seguro
NODE_ENV=production
PORT=3000
```
