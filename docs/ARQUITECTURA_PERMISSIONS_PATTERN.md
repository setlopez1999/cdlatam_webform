# Patrón de Centralización de Permisos y Roles (RBAC)

Este documento describe el patrón arquitectónico implementado para centralizar la gestión de permisos y roles en el frontend. Su propósito es servir como referencia para cualquier desarrollador (o agente) que necesite agregar rutas, acciones o roles nuevos al proyecto.

---

## El problema que resuelve

Antes de este patrón, la lógica de permisos estaba regada en tres lugares distintos y sin conexión entre sí:

| Archivo | Qué tenía hardcodeado |
|---|---|
| `App.tsx` | `adminOnly`, `requiredRole` en cada `<Route>` |
| `AppLayout.tsx` | `ADMIN_NAV_ITEMS`, `ROLE_NAV_ITEMS` como arrays estáticos |
| Componentes | `if (isAdmin)`, `if (role === "gestor_horarios")` directo |

Si querías saber qué puede hacer el rol `manager`, tenías que buscar en los tres archivos. Si agregabas una ruta nueva, tenías que actualizar al menos dos archivos. Este patrón elimina esa duplicación.

---

## Estructura de archivos

```
client/src/
├── config/
│   ├── permissions.ts          ← FUENTE ÚNICA DE VERDAD (editar solo aquí)
│   └── routes/
│       └── index.ts            ← Re-exporta desde permissions.ts (compatibilidad)
├── hooks/
│   └── useCan.ts               ← Hook para verificar acciones en componentes
├── App.tsx                     ← ProtectedRoute lee de permissions.ts
└── components/
    └── AppLayout.tsx           ← Sidebar generado dinámicamente desde permissions.ts
```

---

## La fuente única de verdad: `permissions.ts`

El archivo `client/src/config/permissions.ts` tiene dos diccionarios:

### 1. `ROUTE_PERMISSIONS` — Control de acceso a rutas

Define quién puede entrar a cada path y si aparece en el sidebar.

```ts
export const ROUTE_PERMISSIONS: Record<string, RoutePermission> = {

  // Solo admin
  "/usuarios": {
    roles: [ROLE_ADMIN],        // ROLE_ADMIN = "admin"
    label: "Usuarios",
    icon: "Users",              // nombre del icono de lucide-react
    showInNav: true,            // aparece en el sidebar
  },

  // Por rol RBAC específico
  "/gestor-horarios": {
    roles: ["gestor_horarios"],
    label: "Gestor de Horarios",
    icon: "CalendarClock",
    showInNav: true,
  },

  // Cualquier usuario autenticado
  "/home": {
    roles: [ROLE_ANY],          // ROLE_ANY = "*"
    label: "Inicio",
    icon: "LayoutDashboard",
    showInNav: true,
  },

  // Ruta que no aparece en sidebar pero sí está protegida
  "/base-datos/spreadsheet": {
    roles: [ROLE_ADMIN],
    label: "Spreadsheet",
    showInNav: false,
    fullscreen: true,           // se renderiza sin AppLayout
  },
};
```

### 2. `ACTION_PERMISSIONS` — Control de acciones en componentes

Define qué roles pueden ejecutar acciones específicas dentro de la UI.

```ts
export const ACTION_PERMISSIONS: Record<string, ActionPermission> = {

  "users:manage": {
    roles: [ROLE_ADMIN],
    description: "Crear, editar, activar/desactivar usuarios",
  },

  "users:change_credentials_others": {
    roles: [ROLE_ADMIN],
    description: "Cambiar contraseña o username de otro usuario",
  },

  "expedientes:view_all": {
    roles: [ROLE_ADMIN, "manager"],
    description: "Ver expedientes de todos los usuarios",
  },
};
```

---

## Cómo funciona cada capa

### Capa 1: Protección de rutas (`App.tsx`)

`ProtectedRoute` recibe el `routePath` y consulta `ROUTE_PERMISSIONS` automáticamente. No hay que pasarle roles.

```tsx
// ✅ Así se hace ahora
<Route path="/usuarios">
  {() => <ProtectedRoute component={Usuarios} routePath="/usuarios" />}
</Route>

// ❌ Así era antes (NO usar)
<Route path="/usuarios">
  {() => <ProtectedRoute component={Usuarios} adminOnly />}
</Route>
```

Si la ruta no está en `ROUTE_PERMISSIONS`, `ProtectedRoute` deniega el acceso y lanza un `console.warn`.

### Capa 2: Sidebar (`AppLayout.tsx`)

El sidebar se genera solo a partir de `ROUTE_PERMISSIONS`. No hay que tocar `AppLayout.tsx` para agregar items al menú — solo poner `showInNav: true` en `permissions.ts`.

```
Admin ve:          Usuario normal ve:    Usuario con gestor_horarios ve:
─────────────      ─────────────────     ───────────────────────────────
Dashboard          Inicio                Inicio
Base de Datos      Historial             Historial
Usuarios                                 Gestor de Horarios
Historial
```

### Capa 3: Acciones en componentes (`useCan`)

El hook `useCan` permite verificar permisos de acciones sin hardcodear roles en los componentes.

```tsx
import { useCan } from "@/hooks/useCan";

function Usuarios() {
  const can = useCan();

  return (
    <div>
      {/* Solo admin ve el botón de crear usuario */}
      {can("users:manage") && <BtnCrearUsuario />}

      {/* Solo admin puede cambiar credenciales de otros */}
      {can("users:change_credentials_others") && <BtnCambiarPass />}
    </div>
  );
}
```

---

## Guía: cómo agregar algo nuevo

### Caso A — Nueva ruta protegida

**Paso 1:** Agregar en `permissions.ts`:
```ts
"/reportes": {
  roles: ["admin", "manager"],
  label: "Reportes",
  icon: "BarChart3",
  showInNav: true,
},
```

**Paso 2:** Registrar en `App.tsx`:
```tsx
<Route path="/reportes">
  {() => <ProtectedRoute component={Reportes} routePath="/reportes" />}
</Route>
```

**Resultado:** La ruta queda protegida Y el sidebar la muestra automáticamente para admin y manager. No hay que tocar `AppLayout.tsx`.

---

### Caso B — Nueva acción restringida en un componente

**Paso 1:** Agregar en `permissions.ts`:
```ts
"reportes:exportar": {
  roles: ["admin", "manager"],
  description: "Exportar reportes a Excel o PDF",
},
```

**Paso 2:** Usar en el componente:
```tsx
const can = useCan();
{can("reportes:exportar") && <BtnExportar />}
```

---

### Caso C — Nuevo rol RBAC

**Paso 1:** Agregar el tipo en `permissions.ts`:
```ts
export type RbacRole = "gestor_horarios" | "manager" | "viewer" | "supervisor"; // ← agregar acá
```

**Paso 2:** Asignarlo a las rutas o acciones que corresponda:
```ts
"/supervisores": {
  roles: ["supervisor", ROLE_ADMIN],
  label: "Supervisores",
  icon: "UserCheck",
  showInNav: true,
},
```

**Paso 3:** Agregar el icono en el `ICON_MAP` de `AppLayout.tsx` si es uno nuevo:
```ts
const ICON_MAP: Record<string, LucideIcon> = {
  // ...existentes...
  UserCheck,  // ← agregar acá
};
```

**Paso 4:** Crear el rol en la BD (tabla `roles`) y asignarlo al usuario.

---

## Roles especiales

| Constante | Valor | Significado |
|---|---|---|
| `ROLE_ADMIN` | `"admin"` | Superusuario — siempre tiene acceso a todo |
| `ROLE_ANY` | `"*"` | Cualquier usuario autenticado tiene acceso |

La función `evaluatePermission(userRoles, required)` aplica estas reglas:
1. Si el usuario tiene el rol `"admin"` → acceso garantizado sin importar `required`
2. Si `required` incluye `"*"` → acceso para cualquier autenticado
3. En otro caso → el usuario debe tener al menos uno de los roles en `required`

---

## Resumen visual del flujo

```
permissions.ts
     │
     ├─── ROUTE_PERMISSIONS ──→ App.tsx (ProtectedRoute)
     │                       └→ AppLayout.tsx (sidebar dinámico)
     │
     └─── ACTION_PERMISSIONS ─→ useCan() hook ──→ componentes
```

Cualquier cambio de política de acceso se hace **solo en `permissions.ts`** y se propaga automáticamente al resto.
