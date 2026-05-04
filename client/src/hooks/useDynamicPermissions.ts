import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLocalAuth } from "@/hooks/useLocalAuth";

/**
 * useDynamicPermissions — Carga las reglas de la BD y las formatea para evaluatePermission.
 * 
 * Devuelve un objeto Record<roleName, routePath[]>
 */
export function useDynamicPermissions() {
  const { isAuthenticated, isAdmin } = useLocalAuth();
  const { data: roles = [] } = trpc.roles.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: rules = [], isLoading } = trpc.permissions.getRules.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const dynamicRules = useMemo(() => {
    const map: Record<string, string[]> = {};
    
    rules.forEach(rule => {
      // Encontrar el nombre del rol correspondiente al roleId
      const role = roles.find(r => String(r.id) === String(rule.roleId));
      if (role) {
        if (!map[role.nombre]) map[role.nombre] = [];
        map[role.nombre].push(rule.routePath);
      }
    });
    
    return map;
  }, [rules, roles]);

  return { dynamicRules, isLoading };
}
