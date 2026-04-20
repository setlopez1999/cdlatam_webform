# Arquitectura de Seguridad y Control de Acceso

## Principio base: Defensa en profundidad

El sistema usa **dos capas de protección** independientes. Ambas son obligatorias y no son redundantes:

| Capa | Dónde vive | Responsabilidad |
|---|---|---|
| **Capa 1 — Servidor (tRPC)** | `server/routers.ts` + `server/_core/context.ts` | Protección real de datos. Rechaza peticiones no autorizadas aunque vengan de fuera del navegador (curl, Postman, scripts) |
| **Capa 2 — Cliente (React)** | `App.tsx` + `useLocalAuth` + `AppLayout` | UX. Oculta rutas y menús que el usuario no puede usar. No es seguridad real, es experiencia de usuario |

> **Regla de oro:** nunca confiar solo en el cliente. Un usuario malicioso puede ignorar el cliente y llamar directamente a la API. El servidor siempre debe verificar.

---

## Capa 1 — Servidor

### Flujo de autenticación por request

```
Request HTTP
  → Express recibe la petición
  → context.ts lee la cookie local_session
  → verifica el JWT con JWT_SECRET
  → busca el usuario en la BD por id
  → si isActive=1 → ctx.user = dbUser
  → si no         → ctx.user = null
  → tRPC ejecuta el procedimiento con ctx
```

### Verificación de rol en cada endpoint

Cada endpoint protegido hace la verificación explícitamente:

```ts
// Ejemplo en routers.ts
.query(async ({ ctx }) => {
  if (ctx.user?.role !== "admin") throw new Error("Acceso denegado");
  // ... lógica de admin
})
```

No hay un middleware global de roles — cada procedimiento decide su nivel de acceso. Esto es intencional: da control granular por endpoint.

### Endpoints actualmente protegidos por rol `admin`

| Endpoint tRPC | Descripción |
|---|---|
| `users.list` | Listar usuarios |
| `users.create` | Crear usuario |
| `users.update` | Editar usuario |
| `users.toggleStatus` | Activar/desactivar usuario |
| `roles.*` | Toda la gestión de roles |
| `catalogs.listTables` | Ver tablas de la BD |
| `catalogs.create/delete` | Gestionar catálogos custom |

---

## Capa 2 — Cliente

### Hook central: `useLocalAuth`

Archivo: `client/src/hooks/useLocalAuth.ts`

```ts
isAdmin: currentUser?.role === "admin"
```

Expone `isAdmin` como booleano derivado del campo `role` del usuario en sesión. Todo el cliente consume este hook.

### Guardia de rutas: `ProtectedRoute`

Archivo: `client/src/App.tsx`

```ts
function ProtectedRoute({ component, adminOnly = false }) {
  const { isAuthenticated, isAdmin } = useLocalAuth();

  if (!isAuthenticated) → redirige a /login
  if (adminOnly && !isAdmin) → redirige a /home
  return <component />
}
```

### Rutas y sus niveles de acceso

| Ruta | `adminOnly` | Visible para |
|---|---|---|
| `/` (Dashboard) | Sí | Solo admin |
| `/base-datos` | Sí | Solo admin |
| `/usuarios` | Sí | Solo admin |
| `/historial` | Sí | Solo admin |
| `/home` | No | Todos |
| `/nuevo-expediente` | No | Todos |
| `/expediente/*` | No | Todos |

### Menú lateral: `AppLayout`

Archivo: `client/src/components/AppLayout.tsx`

Los ítems del menú tienen `adminOnly: true`. El componente filtra:

```ts
const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);
```

Un usuario normal no ve los ítems de admin en el menú, y aunque navegue manualmente a la URL, `ProtectedRoute` lo redirige.

---

## Estado actual vs. arquitectura objetivo

### Estado actual (simple, funcional)

```
users.role = "admin" | "user"   (campo TEXT en la tabla users)
isAdmin = role === "admin"       (booleano binario)
```

**Limitación:** solo soporta dos niveles. No permite roles intermedios (ej: `gestor_horarios` que ve una pantalla específica pero no la BD).

### Arquitectura objetivo (RBAC — Role-Based Access Control)

```
users ──< user_roles >── roles
```

- Un usuario puede tener **múltiples roles**
- Cada pantalla/endpoint declara qué rol necesita
- Agregar un nuevo rol no requiere cambiar código, solo insertar en la tabla `roles`

La función de verificación cambia de:

```ts
// Actual — hardcodeado
if (ctx.user?.role !== "admin") throw new Error("Acceso denegado");
```

A:

```ts
// Objetivo — genérico
if (!await hasRole(ctx, "admin")) throw new Error("Acceso denegado");
// o para múltiples roles permitidos:
if (!await hasAnyRole(ctx, ["admin", "gestor_horarios"])) throw new Error("Acceso denegado");
```

Y en el cliente:

```ts
// Actual
if (adminOnly && !isAdmin) → redirige

// Objetivo
if (requiredRole && !hasRole(requiredRole)) → redirige
```

---

## Diferencia entre Roles y Permisos

> En la pantalla de Usuarios actual aparecen dos conceptos: **"Permiso base"** y **"Rol asignado"**. Son distintos:

| Concepto | Campo en BD | Qué controla | Estado |
|---|---|---|---|
| **Permiso base** | `users.role` (TEXT) | Acceso binario: admin o user. Es el guard principal actual | Activo — usado en todos los guards |
| **Rol asignado** | `users.roleId` (FK a `roles`) | Rol semántico de la tabla `roles`. Actualmente decorativo | Existe en BD pero **no se usa en guards** |

El objetivo de la migración RBAC es eliminar `users.role` como campo de control y usar exclusivamente `user_roles` (tabla intermedia N:N) como fuente de verdad para los guards.

---

## Para agregar una nueva pantalla protegida (flujo actual)

1. Crear el componente en `client/src/pages/`
2. Agregar la ruta en `App.tsx` con `<ProtectedRoute component={MiPantalla} adminOnly />`
3. Agregar el ítem al menú en `AppLayout.tsx` con `adminOnly: true`
4. Proteger los endpoints tRPC correspondientes con `if (ctx.user?.role !== "admin")`

## Para agregar una nueva pantalla protegida (flujo RBAC objetivo)

1. Crear el componente en `client/src/pages/`
2. Agregar la ruta en `App.tsx` con `<ProtectedRoute component={MiPantalla} requiredRole="gestor_horarios" />`
3. Agregar el ítem al menú con `requiredRole: "gestor_horarios"`
4. Proteger los endpoints con `if (!await hasRole(ctx, "gestor_horarios"))`
5. Asignar el rol al usuario desde la pantalla de Usuarios — sin tocar código
