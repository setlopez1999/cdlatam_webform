/**
 * useLocalAuth — Hook de autenticación conectado directamente a la Base de Datos local (gestion.db)
 * usando los endpoints nativos de tRPC del servidor.
 *
 * Emplea Zustand (`useAuthStore`) para la gestión global y persistente de la sesión.
 *
 * ─── SISTEMA DE ROLES ────────────────────────────────────────────────────────
 * Fuente única de verdad: `myRoles` (array de strings desde user_roles en BD via tRPC).
 * El campo legacy `currentUser.role` solo se usa como fallback para isAdmin durante
 * la ventana de carga inicial antes de que myRoles llegue del servidor.
 *
 * Jerarquía de verificación:
 *   1. isAdmin  → myRoles.includes("admin") || currentUser.role === "admin" (legacy fallback)
 *   2. hasRole  → isAdmin || myRoles.includes(roleName)
 *   3. useCan() → evaluatePermission() de permissions.ts (fuente de verdad de permisos)
 *
 * NO usar `currentUser.role` directamente en componentes — usar isAdmin, hasRole() o useCan().
 *
 * Provee:
 *  - currentUser: usuario autenticado
 *  - isAuthenticated: boolean
 *  - isAdmin: boolean — true si el usuario tiene el rol "admin" (RBAC o campo legacy)
 *  - hasRole(roleName): boolean — verifica si el usuario tiene un rol específico
 *  - hasAnyRole(roleNames[]): boolean — verifica si el usuario tiene alguno de los roles
 *  - myRoles: string[] — lista de roles RBAC del usuario (fuente primaria)
 *  - login(username, password): Promise
 *  - logout(): Promise
 *  - isLoading: boolean
 *  - loginError: string | null
 *  - isLoggingIn: boolean
 */

import { useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuthStore } from "./useAuthStore";

export interface AuthUser {
  id: number | string;
  username: string;
  displayName?: string | null;
  /** Campo legacy del JWT — solo usar para isAdmin, no para lógica de permisos en componentes */
  role: "user" | "admin" | string;
}

export function useLocalAuth() {
  const { user: currentUser, setUser, clearAuth } = useAuthStore();

  // Consulta por el usuario activo (lee las cookies que envían el JWT local)
  const { data: user, isLoading, refetch } = trpc.localAuth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Consulta los roles RBAC del usuario autenticado desde user_roles
  const { data: myRoles = [] } = trpc.userRoles.myRoles.useQuery(undefined, {
    enabled: !!user,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Mantiene sincronizado el payload de la DB con el store de Zustand
  useEffect(() => {
    if (!isLoading) {
      setUser(user ? (user as AuthUser) : null);
    }
  }, [user, isLoading, setUser]);

  const loginMutation = trpc.localAuth.login.useMutation();
  const logoutMutation = trpc.localAuth.logout.useMutation();

  const login = useCallback(async (username: string, password: string) => {
    try {
      const result = await loginMutation.mutateAsync({ username, password });
      if (result.success && result.user) {
        setUser(result.user as AuthUser);
        await refetch();
        return result.user as AuthUser;
      }
      throw new Error("Credenciales inválidas");
    } catch (err: any) {
      throw new Error(err.message || "Error al iniciar sesión");
    }
  }, [loginMutation, refetch, setUser]);

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (err) {
      console.warn("Error al intentar cerrar sesión:", err);
    }
    clearAuth();
    await refetch();
  }, [logoutMutation, refetch, clearAuth]);

  /**
   * isAdmin — true si el usuario tiene el rol "admin".
   *
   * Fuente primaria: myRoles (RBAC desde user_roles en BD).
   * Fallback: campo legacy `role` del JWT (ventana de carga inicial antes de que myRoles llegue).
   */
  const isAdmin = myRoles.includes("admin") || currentUser?.role === "admin";

  /**
   * hasRole — verifica si el usuario tiene un rol específico.
   *
   * Fuente única: myRoles (RBAC desde user_roles en BD).
   * Admin tiene acceso a todos los roles (verificado via isAdmin).
   *
   * Para verificar permisos de acciones, usar `useCan()` en su lugar.
   */
  const hasRole = useCallback((roleName: string): boolean => {
    if (!currentUser) return false;
    if (isAdmin) return true;
    return myRoles.includes(roleName);
  }, [currentUser, isAdmin, myRoles]);

  /**
   * hasAnyRole — verifica si el usuario tiene al menos uno de los roles dados.
   *
   * Fuente única: myRoles (RBAC desde user_roles en BD).
   */
  const hasAnyRole = useCallback((roleNames: string[]): boolean => {
    if (!currentUser) return false;
    if (isAdmin) return true;
    return roleNames.some(r => myRoles.includes(r));
  }, [currentUser, isAdmin, myRoles]);

  return {
    currentUser,
    isAuthenticated: !!currentUser,
    isAdmin,
    hasRole,
    hasAnyRole,
    myRoles,
    isLoading,
    login,
    logout,
    loginError: loginMutation.error?.message || null,
    isLoggingIn: loginMutation.isPending,
  };
}
