/**
 * useLocalAuth — Hook para gestionar la autenticación local (username/password)
 *
 * Provee:
 *  - currentUser: usuario autenticado (id, username, displayName, role)
 *  - isAuthenticated: boolean
 *  - isAdmin: boolean
 *  - login(username, password): Promise
 *  - logout(): Promise
 *  - isLoading: boolean
 */

import { trpc } from "@/lib/trpc";
import { useCallback } from "react";

export function useLocalAuth() {
  const { data: currentUser, isLoading, refetch } = trpc.localAuth.me.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const loginMutation = trpc.localAuth.login.useMutation();
  const logoutMutation = trpc.localAuth.logout.useMutation();

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await loginMutation.mutateAsync({ username, password });
      await refetch();
      return result;
    },
    [loginMutation, refetch]
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
    await refetch();
  }, [logoutMutation, refetch]);

  return {
    currentUser: currentUser ?? null,
    isAuthenticated: !!currentUser,
    isAdmin: currentUser?.role === "admin",
    isLoading,
    login,
    logout,
    loginError: loginMutation.error?.message ?? null,
    isLoggingIn: loginMutation.isPending,
  };
}
