/**
 * config/routes/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Re-exporta la configuración de rutas derivada de permissions.ts.
 *
 * IMPORTANTE: Ya no definas permisos acá. Toda la lógica de acceso vive en:
 *   client/src/config/permissions.ts
 *
 * Este archivo existe para mantener compatibilidad con el resto del código
 * que importa RouteConfig o APP_ROUTES desde acá.
 *
 * Para agregar una nueva ruta protegida:
 *   1. Agregar la entrada en client/src/config/permissions.ts → ROUTE_PERMISSIONS
 *   2. Registrar el componente en client/src/App.tsx → Router()
 *   3. Listo — el sidebar lo tomará automáticamente
 */
export type { RoutePermission as RouteConfig } from "@/config/permissions";
export {
  ROUTE_PERMISSIONS as APP_ROUTES,
  getNavItemsForRoles as getRoutesForRole,
} from "@/config/permissions";
