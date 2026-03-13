/**
 * useLocalAuth — Hook de autenticación conectado directamente a la Base de Datos local (gestion.db) 
 * usando los endpoints nativos de tRPC del servidor. 
 *
 * Emplea Zustand (`useAuthStore`) para la gestión global y persistente de la sesión.
 *
 * Provee:
 *  - currentUser: usuario autenticado
 *  - isAuthenticated: boolean
 *  - isAdmin: boolean
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

  return {
    currentUser,
    isAuthenticated: !!currentUser,
    isAdmin: currentUser?.role === "admin",
    isLoading,
    login,
    logout,
    loginError: loginMutation.error?.message || null,
    isLoggingIn: loginMutation.isPending,
  };
}
