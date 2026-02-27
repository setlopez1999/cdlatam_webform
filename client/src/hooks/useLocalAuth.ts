/**
 * useLocalAuth — Hook de autenticación desacoplado de tRPC
 *
 * Ahora consume authService, que llama a la API REST configurada en VITE_API_URL.
 * Si la API no está configurada, usa el fallback local (localStorage).
 *
 * Provee:
 *  - currentUser: usuario autenticado (id, username, nombre, role)
 *  - isAuthenticated: boolean
 *  - isAdmin: boolean
 *  - login(username, password): Promise
 *  - logout(): Promise
 *  - isLoading: boolean
 *  - loginError: string | null
 *  - isLoggingIn: boolean
 */

import { useState, useEffect, useCallback } from "react";
import { authService } from "@/core/services/authService";
import type { AuthUser } from "@/core/services/authService";

export function useLocalAuth() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Cargar sesión al montar el componente
  useEffect(() => {
    let cancelled = false;
    authService.me().then((user) => {
      if (!cancelled) {
        setCurrentUser(user);
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const user = await authService.login({ username, password });
      setCurrentUser(user);
      return user;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al iniciar sesión";
      setLoginError(msg);
      throw err;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setCurrentUser(null);
  }, []);

  return {
    currentUser,
    isAuthenticated: !!currentUser,
    isAdmin: currentUser?.role === "admin",
    isLoading,
    login,
    logout,
    loginError,
    isLoggingIn,
  };
}
