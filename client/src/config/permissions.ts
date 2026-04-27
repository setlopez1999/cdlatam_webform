/**
 * permissions.ts — Fuente única de verdad de permisos del frontend
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PROPÓSITO
 * Este archivo centraliza TODOS los permisos de la aplicación en un solo lugar.
 * Si querés saber qué puede hacer un rol, venís acá. Si querés agregar un permiso
 * a una ruta o acción, lo cambiás acá y se propaga automáticamente al router,
 * al sidebar y a los componentes.
 *
 * ESTRUCTURA
 *  - ROUTE_PERMISSIONS: permisos de acceso por ruta (quién puede entrar a cada path)
 *  - ACTION_PERMISSIONS: permisos de acciones específicas dentro de componentes
 *  - NAV_ITEMS: items del sidebar generados desde ROUTE_PERMISSIONS
 *
 * ROLES ESPECIALES
 *  - "admin"  → acceso total (superusuario, siempre tiene permiso)
 *  - "*"      → cualquier usuario autenticado tiene acceso
 *
 * ROLES RBAC (definidos en la tabla `roles` de la BD)
 *  - "gestor_horarios"       → acceso a la pantalla de Gestor de Horarios
 *  - "manager"               → puede ver todo, no puede gestionar usuarios
 *  - "viewer"                → acceso de solo lectura
 *  - "perfil_full"           → acceso completo a F1-Acta, F2-EP, Resultados e Implementación
 *  - "perfil_ventas"         → acceso restringido únicamente a F1-Acta
 *  - "perfil_implementacion" → acceso restringido únicamente a Implementación
 *
 * USO EN COMPONENTES
 *  import { useCan } from "@/hooks/useCan";
 *  const can = useCan();
 *  if (can("users:manage")) { ... }
 *
 * USO EN RUTAS (App.tsx)
 *  import { ROUTE_PERMISSIONS } from "@/config/permissions";
 *  const perm = ROUTE_PERMISSIONS["/usuarios"];
 *  // perm.roles → ["admin"]
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Rol especial que indica acceso para cualquier usuario autenticado */
export const ROLE_ANY = "*" as const;

/** Rol especial que indica acceso solo para administradores */
export const ROLE_ADMIN = "admin" as const;

export type SpecialRole = typeof ROLE_ANY | typeof ROLE_ADMIN;
export type RbacRole = "gestor_horarios" | "manager" | "viewer" | "perfil_full" | "perfil_ventas" | "perfil_implementacion";
export type AppRole = SpecialRole | RbacRole;

export interface RoutePermission {
  /** Roles que pueden acceder a esta ruta. "admin" = solo admin. "*" = todos. */
  roles: AppRole[];
  /** Etiqueta legible para el sidebar y documentación */
  label: string;
  /** Nombre del icono de lucide-react para el sidebar (string, se resuelve en AppLayout) */
  icon?: string;
  /** Si aparece en el sidebar de navegación */
  showInNav: boolean;
  /** Si la ruta se muestra en modo fullscreen (sin AppLayout) */
  fullscreen?: boolean;
}

export interface ActionPermission {
  /** Roles que pueden ejecutar esta acción */
  roles: AppRole[];
  /** Descripción legible de la acción */
  description: string;
  /**
   * Si true, el rol "admin" NO tiene acceso automático.
   * El usuario debe tener el rol explícitamente en user_roles.
   * Usado para el easter egg de gestor_horarios.
   */
  strictRoles?: boolean;
}

// ─── Permisos de rutas ────────────────────────────────────────────────────────
/**
 * ROUTE_PERMISSIONS
 *
 * Mapa de path → permisos.
 * Este objeto es la fuente de verdad para:
 *   1. Protección de rutas en App.tsx (ProtectedRoute)
 *   2. Items del sidebar en AppLayout.tsx
 *   3. Documentación de acceso
 *
 * Para agregar una nueva ruta protegida:
 *   1. Agregar la entrada acá con su path, roles, label e icon
 *   2. App.tsx y AppLayout.tsx la tomarán automáticamente
 */
export const ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  // ── Rutas de admin ──────────────────────────────────────────────────────────
  "/": {
    roles: [ROLE_ADMIN],
    label: "Dashboard",
    icon: "LayoutDashboard",
    showInNav: true,
  },
  "/resultado": {
    roles: [ROLE_ADMIN],
    label: "Resultado",
    icon: "BarChart3",
    showInNav: false, // accesible pero no aparece en sidebar directo
  },
  "/base-datos": {
    roles: [ROLE_ADMIN],
    label: "Base de Datos",
    icon: "Database",
    showInNav: true,
  },
  "/base-datos/spreadsheet": {
    roles: [ROLE_ADMIN],
    label: "Spreadsheet",
    icon: "Table",
    showInNav: false,
    fullscreen: true,
  },
  "/usuarios": {
    roles: [ROLE_ADMIN],
    label: "Usuarios",
    icon: "Users",
    showInNav: true,
  },
  "/historial": {
    roles: [ROLE_ADMIN],
    label: "Historial",
    icon: "History",
    showInNav: true,
  },

  // ── Rutas por rol RBAC ──────────────────────────────────────────────────────
  "/gestor-horarios": {
    roles: ["gestor_horarios"],
    label: "Gestor de Horarios",
    icon: "CalendarClock",
    showInNav: false,
  },

  // ── Rutas para todos los usuarios autenticados ──────────────────────────────
  "/home": {
    roles: [ROLE_ANY],
    label: "Inicio",
    icon: "LayoutDashboard",
    showInNav: true,
  },
  "/nuevo-expediente": {
    roles: [ROLE_ANY],
    label: "Nuevo Expediente",
    icon: "FilePlus",
    showInNav: false,
  },
  "/expediente/:id/acta": {
    roles: [ROLE_ANY],
    label: "Acta",
    showInNav: false,
  },
  "/expediente/:id/ep": {
    roles: [ROLE_ANY],
    label: "Evaluación de Proyecto",
    showInNav: false,
  },
  "/expediente/:id/resultados": {
    roles: [ROLE_ANY],
    label: "Resultados",
    showInNav: false,
  },
  "/expediente/:id/implementacion": {
    roles: [ROLE_ANY],
    label: "Implementación",
    showInNav: false,
  },
};

// ─── Permisos de acciones ─────────────────────────────────────────────────────
/**
 * ACTION_PERMISSIONS
 *
 * Permisos para acciones específicas dentro de componentes.
 * Usar con el hook `useCan()`:
 *
 *   const can = useCan();
 *   if (can("users:manage")) { ... }
 *
 * Convención de nombres: "recurso:accion"
 */
export const ACTION_PERMISSIONS: Record<string, ActionPermission> = {
  // ── Gestión de usuarios ─────────────────────────────────────────────────────
  "users:manage": {
    roles: [ROLE_ADMIN],
    description: "Crear, editar, activar/desactivar usuarios",
  },
  "users:change_credentials_others": {
    roles: [ROLE_ADMIN],
    description: "Cambiar contraseña o username de otro usuario sin verificar contraseña actual",
  },

  // ── Gestión de roles ────────────────────────────────────────────────────────
  "roles:manage": {
    roles: [ROLE_ADMIN],
    description: "Crear, editar y eliminar roles del sistema",
  },
  "roles:assign": {
    roles: [ROLE_ADMIN],
    description: "Asignar y revocar roles a usuarios",
  },

  // ── Catálogos / Base de datos ───────────────────────────────────────────────
  "catalogs:manage": {
    roles: [ROLE_ADMIN],
    description: "Crear, editar y eliminar registros de catálogos",
  },
  "catalogs:view": {
    roles: [ROLE_ADMIN, "manager"],
    description: "Ver registros de catálogos",
  },

  // ── Expedientes ─────────────────────────────────────────────────────────────
  "expedientes:create": {
    roles: [ROLE_ANY],
    description: "Crear nuevos expedientes (acta + EP)",
  },
  "expedientes:view_own": {
    roles: [ROLE_ANY],
    description: "Ver expedientes propios",
  },
  "expedientes:view_all": {
    roles: [ROLE_ADMIN, "manager", "perfil_full"],
    description: "Ver expedientes de todos los usuarios",
  },

  // ── Visibilidad de tabs de expediente ───────────────────────────────────────
  "expediente:tab_f1": {
    roles: [ROLE_ANY],
    description: "Ver tab F1-Acta (todos los usuarios)",
  },
  "expediente:tab_f2": {
    roles: [ROLE_ADMIN, "manager", "perfil_full", "viewer"],
    description: "Ver tab F2-EP (no disponible para perfil_ventas ni perfil_implementacion)",
  },
  "expediente:tab_resultados": {
    roles: [ROLE_ADMIN, "manager", "perfil_full", "viewer"],
    description: "Ver tab Resultados",
  },
  "expediente:tab_implementacion": {
    roles: [ROLE_ADMIN, "manager", "perfil_full", "perfil_implementacion"],
    description: "Ver tab Implementación",
  },

  // ── Campos sensibles de expediente ──────────────────────────────────────────
  "expediente:view_sensitive_fields": {
    roles: [ROLE_ADMIN, "manager", "perfil_full"],
    description: "Ver campos sensibles del acta: montos, formas de pago, consideraciones personalizadas y cláusulas legales",
  },

  // ── Gestor de horarios ──────────────────────────────────────────────────────
  // EASTER EGG: strictRoles=true → admin NO tiene acceso automático.
  // Solo quien tenga gestor_horarios explícito (vía 5 clicks en el Dashboard).
  "horarios:manage": {
    roles: ["gestor_horarios"],
    strictRoles: true,
    description: "Acceder y gestionar el módulo de horarios (easter egg)",
  },
};

// ─── Helpers de evaluación ────────────────────────────────────────────────────

/**
 * Evalúa si un conjunto de roles del usuario satisface los roles requeridos.
 *
 * @param userRoles  - Roles que tiene el usuario (incluyendo el campo legacy `role`)
 * @param required   - Roles requeridos por el permiso
 * @returns true si el usuario tiene acceso
 */
export function evaluatePermission(
  userRoles: string[],
  required: AppRole[],
  strict = false
): boolean {
  // Si strictRoles=true, el admin NO tiene acceso automático
  if (!strict && userRoles.includes(ROLE_ADMIN)) return true;
  // Si el permiso es para todos los autenticados
  if (required.includes(ROLE_ANY)) return true;
  // Verificar si el usuario tiene al menos uno de los roles requeridos
  return required.some((r) => userRoles.includes(r));
}

/**
 * Devuelve los items de navegación visibles para un usuario dado sus roles.
 * Usado por AppLayout para construir el sidebar dinámicamente.
 */
export function getNavItemsForRoles(userRoles: string[]): Array<{ path: string; perm: RoutePermission }> {
  return Object.entries(ROUTE_PERMISSIONS)
    .filter(([, perm]) => perm.showInNav && evaluatePermission(userRoles, perm.roles))
    .map(([path, perm]) => ({ path, perm }));
}
