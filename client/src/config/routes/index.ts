/**
 * config/routes/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Definición centralizada de todas las rutas de la aplicación.
 * Aquí se controla qué rutas requieren autenticación y qué rol necesitan.
 *
 * Para agregar una nueva ruta:
 *   1. Importa el componente de pantalla desde core/screens/
 *   2. Agrega la entrada en APP_ROUTES con el path, componente y permisos
 *   3. El sistema de navegación (AppLayout) leerá automáticamente esta config
 */

export interface RouteConfig {
  path: string;
  label: string;
  icon?: string;
  requiresAuth: boolean;
  requiresAdmin: boolean;
  showInSidebar: boolean;
}

export const APP_ROUTES: RouteConfig[] = [
  {
    path: "/login",
    label: "Iniciar Sesión",
    requiresAuth: false,
    requiresAdmin: false,
    showInSidebar: false,
  },
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    requiresAuth: true,
    requiresAdmin: true,
    showInSidebar: true,
  },
  {
    path: "/acta",
    label: "Acta",
    icon: "FileText",
    requiresAuth: true,
    requiresAdmin: false,
    showInSidebar: true,
  },
  {
    path: "/ep",
    label: "Evaluación de Proyecto",
    icon: "ClipboardList",
    requiresAuth: true,
    requiresAdmin: false,
    showInSidebar: true,
  },
  {
    path: "/resultado",
    label: "Resultado",
    icon: "BarChart3",
    requiresAuth: true,
    requiresAdmin: true,
    showInSidebar: true,
  },
  {
    path: "/base-datos",
    label: "Base de Datos",
    icon: "Database",
    requiresAuth: true,
    requiresAdmin: true,
    showInSidebar: true,
  },
  {
    path: "/usuarios",
    label: "Usuarios",
    icon: "Users",
    requiresAuth: true,
    requiresAdmin: true,
    showInSidebar: true,
  },
];

/** Rutas accesibles para un rol dado */
export function getRoutesForRole(isAdmin: boolean): RouteConfig[] {
  return APP_ROUTES.filter(r => {
    if (!r.requiresAuth) return false;
    if (r.requiresAdmin && !isAdmin) return false;
    return r.showInSidebar;
  });
}
