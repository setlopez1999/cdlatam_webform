/**
 * useCan — Hook para verificar permisos de acciones en componentes.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Consulta ACTION_PERMISSIONS de permissions.ts para determinar si el usuario
 * actual puede ejecutar una acción específica.
 *
 * USO:
 *   import { useCan } from "@/hooks/useCan";
 *
 *   function MiComponente() {
 *     const can = useCan();
 *
 *     return (
 *       <>
 *         {can("users:manage") && <BtnCrearUsuario />}
 *         {can("users:change_credentials_others") && <BtnCambiarPass />}
 *       </>
 *     );
 *   }
 *
 * Para agregar una nueva acción:
 *   1. Agregar la entrada en ACTION_PERMISSIONS (permissions.ts)
 *   2. Usar can("mi:accion") en el componente
 */
import { useCallback } from "react";
import { useLocalAuth } from "@/hooks/useLocalAuth";
import { ACTION_PERMISSIONS, evaluatePermission, ROLE_ADMIN } from "@/config/permissions";

/**
 * Devuelve una función `can(actionKey)` que evalúa si el usuario actual
 * tiene permiso para ejecutar la acción indicada.
 *
 * @returns función `can` que recibe el key de una acción y devuelve boolean
 */
export function useCan(): (actionKey: string) => boolean {
  const { isAdmin, myRoles } = useLocalAuth();

  const userRoles = [...(isAdmin ? [ROLE_ADMIN] : []), ...myRoles];

  const can = useCallback(
    (actionKey: string): boolean => {
      const perm = ACTION_PERMISSIONS[actionKey];
      if (!perm) {
        console.warn(`[useCan] Acción "${actionKey}" no registrada en ACTION_PERMISSIONS`);
        return false;
      }
      return evaluatePermission(userRoles, perm.roles, perm.strictRoles ?? false);
    },
    [userRoles]
  );

  return can;
}
