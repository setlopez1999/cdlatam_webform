import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from './useLocalAuth';

interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearAuth: () => set({ user: null }),
    }),
    {
      name: 'auth-storage', // Guardado persistente en localStorage
    }
  )
);
