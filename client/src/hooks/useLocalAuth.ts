/**
 * useLocalAuth — Hook de autenticación conectado directamente a la Base de Datos local (gestion.db) 
 * usando los endpoints nativos de tRPC del servidor. 
 *
 * Emplea Zustand (`useAuthStore`) para la gestión global y persistente de la sesión.
 *
 * Provee:
 *  - currentUser: usuario autenticado
 *  - isAuthenticated: boolean
 *  - isAdmin: boolean — true si el usuario tiene el rol "admin" en user_roles
 *  - hasRole(roleName): boolean — verifica si el usuario tiene un rol específico
 *  - hasAnyRole(roleNames[]): boolean — verifica si el usuario tiene alguno de los roles
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
   * Verifica si el usuario tiene un rol específico.
   * Fuente primaria: user_roles (RBAC). Fallback: campo legacy role="admin".
   */
  const hasRole = useCallback((roleName: string): boolean => {
    if (!currentUser) return false;
    // Fallback legacy: si el campo role es "admin", tiene acceso total
    if (currentUser.role === "admin") return true;
    return myRoles.includes(roleName);
  }, [currentUser, myRoles]);

  /**
   * Verifica si el usuario tiene al menos uno de los roles dados.
   */
  const hasAnyRole = useCallback((roleNames: string[]): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    return roleNames.some(r => myRoles.includes(r));
  }, [currentUser, myRoles]);

  const isAdmin = hasRole("admin");

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
