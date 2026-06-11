# Arquitectura de Seguridad y Control de Acceso

## Principio base: Defensa en profundidad

El sistema usa **dos capas de protección** independientes:

| Capa | Dónde vive | Responsabilidad |
|---|---|---|
| **Capa 1 — Servidor (tRPC)** | `server/routers.ts` + `server/_core/context.ts` + `server/rbac.ts` | Protección real de datos. Rechaza peticiones no autorizadas desde cualquier origen (curl, Postman, scripts) |
| **Capa 2 — Cliente (React)** | `App.tsx` + `useLocalAuth` + `AppLayout` + `ROUTE_PERMISSIONS` | UX. Oculta rutas y menús que el usuario no puede usar |

> **Regla de oro:** nunca confiar solo en el cliente. El servidor siempre verifica.

---

## Capa 1 — Servidor

### Flujo de autenticación por request

```
Request HTTP
  → Express recibe la petición
  → context.ts lee la cookie local_session
  → verifica el JWT con JWT_SECRET
  → busca el usuario en la BD por id
  → si isActive=1 → ctx.user = dbUser / ctx.localUser = dbUser
  → si no         → ctx.user = null
  → tRPC ejecuta el procedimiento con ctx
```

### RBAC actual — Roles múltiples (N:N)

El sistema usa **Role-Based Access Control** con tabla intermedia:

```
users ──< user_roles >── roles
```

- Un usuario puede tener **múltiples roles** (tabla `user_roles`).
- Cada endpoint declara qué rol necesita vía `requireRole(ctx, "rol")` o `requireAnyRole(ctx, ["rol1", "rol2"])`.
- La función `rbac.ts` expone `hasRole`, `hasAnyRole`, `requireRole`, `requireAnyRole`.

### Procedimientos según nivel de acceso

| Tipo de procedimiento | Uso actual |
|---|---|
| `publicProcedure` | `auth.login`, `auth.logout`, `system.health`, `localAuth.login` |
| `protectedProcedure` | La mayoría de los endpoints — requiere autenticación |
| `protectedProcedure + requireRole("admin")` | `users.*`, `roles.*`, `catalogs.*`, `audit.list`, `dashboard.*` |

**No se usa el campo `users.role` para control de acceso.** La fuente de verdad son los registros en `user_roles`. El campo `users.role` existe solo para compatibilidad histórica.

### Endpoints protegidos por rol `admin`

| Endpoint tRPC | Descripción |
|---|---|
| `users.list` / `create` / `update` / `toggleStatus` / `delete` | CRUD de usuarios |
| `roles.*` | CRUD de roles y asignación |
| `catalogs.*` | Gestión de catálogos (tablas fijas y dinámicas) |
| `audit.list` | Visualización del log de auditoría |
| `dashboard.stats` | Estadísticas del dashboard |
| `actas.*` / `evaluaciones.*` | Solo si es admin o el creador |
| `expediente.listarResumenWorkspace` | Workspace de administración |

---

## Capa 2 — Cliente

### Hook central: `useLocalAuth`

Archivo: `client/src/hooks/useLocalAuth.ts`

Expone:
- `isAuthenticated`: boolean
- `isAdmin`: boolean (derivado de `hasRole("admin")`)
- `myRoles`: string[] (roles del usuario desde el servidor)
- `isLoading`: estado de carga

### Guardia de rutas: `ProtectedRoute`

Archivo: `client/src/App.tsx`

```tsx
function ProtectedRoute({ component: Component, routePath }) {
  const { isAuthenticated, isAdmin, myRoles, isLoading } = useLocalAuth();
  const perm = ROUTE_PERMISSIONS[routePath];
  if (!perm) return <Redirect to="/home" />;
  const userRoles = [...(isAdmin ? ["admin"] : []), ...myRoles];
  if (!evaluatePermission(userRoles, perm.roles)) return <Redirect to="/home" />;
  return <Component />;
}
```

### Rutas y niveles de acceso (`config/permissions.ts`)

| Ruta | Roles requeridos |
|---|---|
| `/` (Dashboard) | admin |
| `/base-datos` | admin |
| `/usuarios` | admin |
| `/audit-log` | admin |
| `/admin-expedientes` | admin |
| `/clausulas` | admin |
| `/gestor-horarios` | admin, gestor_horarios |
| `/historial` | * (cualquier rol) |
| `/home` | * |
| `/nuevo-expediente` | * |
| `/expediente/*` | * |
| `/login` | pública (sin auth) |

### Menú lateral dinámico

`AppLayout.tsx` filtra los ítems del menú según `myRoles` + `isAdmin`, usando el mismo `ROUTE_PERMISSIONS` como fuente de verdad.

---

## Cómo agregar una nueva pantalla protegida

1. Crear el componente en `client/src/pages/`.
2. Agregar la ruta en `App.tsx` con `<ProtectedRoute component={...} routePath="..." />`.
3. Registrar los roles requeridos en `config/permissions.ts` (`ROUTE_PERMISSIONS`).
4. Agregar ítem al menú en `AppLayout.tsx` con `requiredRoles: ["rol"]`.
5. Proteger los endpoints tRPC con `requireAnyRole(ctx, ["rol"])`.
6. Asignar el rol al usuario desde la pantalla de Usuarios — sin tocar código.
