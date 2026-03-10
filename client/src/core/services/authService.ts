/**
 * authService.ts — Servicio de autenticación via API REST
 *
 * Endpoints consumidos:
 *   POST /api/auth/login        → obtiene token JWT
 *   POST /api/auth/logout       → invalida sesión en servidor
 *   GET  /api/auth/me           → datos del usuario autenticado
 *
 * El token se almacena en localStorage con la clave "cdlatam_auth_token".
 */

import { api, setToken, clearToken, getToken } from "./apiService";

// ── Tipos ─────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: number | string;
  username: string;
  displayName?: string;
  nombre?: string;
  email?: string;
  role: "admin" | "user";
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// ── Servicio ──────────────────────────────────────────────────────────────────
export const authService = {
  /**
   * Inicia sesión llamando a POST /api/auth/login.
   */
  async login(credentials: LoginRequest): Promise<AuthUser> {
    const response = await api.post<LoginResponse>("/api/auth/login", credentials);
    setToken(response.token);
    return response.user;
  },

  /**
   * Cierra sesión invocando POST /api/auth/logout.
   */
  async logout(): Promise<void> {
    if (getToken()) {
      try {
        await api.post("/api/auth/logout");
      } catch {
        // ignorar errores de logout en servidor
      }
      clearToken();
    }
  },

  /**
   * Obtiene el usuario autenticado actual.
   * Llama a GET /api/auth/me verificando el token.
   */
  async me(): Promise<AuthUser | null> {
    if (!getToken()) return null;
    try {
      return await api.get<AuthUser>("/api/auth/me");
    } catch {
      clearToken();
      return null;
    }
  },
};
