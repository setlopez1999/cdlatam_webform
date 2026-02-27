/**
 * authService.ts — Servicio de autenticación via API REST
 *
 * Endpoints consumidos:
 *   POST /auth/login        → obtiene token JWT
 *   POST /auth/logout       → invalida sesión en servidor
 *   GET  /auth/me           → datos del usuario autenticado
 *
 * El token se almacena en localStorage con la clave "cdlatam_auth_token".
 * Cambiar VITE_API_URL en .env es suficiente para apuntar a otro servidor.
 */

import { api, setToken, clearToken, getToken, isApiConfigured } from "./apiService";

// ── Tipos ─────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: number | string;
  username: string;
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
  expiresIn?: number; // segundos
}

// ── Fallback local (solo para desarrollo sin API) ─────────────────────────────
const LOCAL_USERS: Record<string, { password: string; user: AuthUser }> = {
  admin: {
    password: "1234",
    user: { id: 1, username: "admin", nombre: "Administrador", role: "admin" },
  },
  usuario: {
    password: "5678",
    user: { id: 2, username: "usuario", nombre: "Usuario", role: "user" },
  },
};

const LOCAL_SESSION_KEY = "cdlatam_local_session";

function saveLocalSession(user: AuthUser): void {
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
}

function loadLocalSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function clearLocalSession(): void {
  localStorage.removeItem(LOCAL_SESSION_KEY);
}

// ── Servicio ──────────────────────────────────────────────────────────────────
export const authService = {
  /**
   * Inicia sesión. Si VITE_API_URL está configurada, llama a POST /auth/login.
   * Si no, usa el modo fallback local (desarrollo).
   *
   * TODO: Conectar con API de Base de Datos aquí — reemplazar el bloque
   *       "fallback local" por la llamada real cuando el backend esté listo.
   */
  async login(credentials: LoginRequest): Promise<AuthUser> {
    if (isApiConfigured()) {
      // ── Modo API REST ──────────────────────────────────────────────────────
      const response = await api.post<LoginResponse>("/auth/login", credentials);
      setToken(response.token);
      return response.user;
    }

    // ── Modo fallback local (sin API configurada) ──────────────────────────
    const entry = LOCAL_USERS[credentials.username];
    if (!entry || entry.password !== credentials.password) {
      throw new Error("Usuario o contraseña incorrectos");
    }
    saveLocalSession(entry.user);
    return entry.user;
  },

  /**
   * Cierra sesión. Llama a POST /auth/logout si la API está configurada.
   *
   * TODO: Conectar con API de Base de Datos aquí.
   */
  async logout(): Promise<void> {
    if (isApiConfigured() && getToken()) {
      try {
        await api.post("/auth/logout");
      } catch {
        // ignorar errores de logout en servidor
      }
      clearToken();
    } else {
      clearLocalSession();
    }
  },

  /**
   * Obtiene el usuario autenticado actual.
   * Llama a GET /auth/me si la API está configurada.
   *
   * TODO: Conectar con API de Base de Datos aquí.
   */
  async me(): Promise<AuthUser | null> {
    if (isApiConfigured()) {
      if (!getToken()) return null;
      try {
        return await api.get<AuthUser>("/auth/me");
      } catch {
        clearToken();
        return null;
      }
    }

    // Fallback local
    return loadLocalSession();
  },
};
