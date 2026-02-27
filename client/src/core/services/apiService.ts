/**
 * apiService.ts — Capa HTTP central para consumo de API REST externa
 *
 * CONFIGURACIÓN: Solo necesitas cambiar VITE_API_URL en tu archivo .env
 *
 * Características:
 * - Token JWT almacenado en localStorage (Bearer token)
 * - Interceptor automático de 401 → redirige a /login
 * - Manejo centralizado de errores con tipos definidos
 * - Soporte para GET, POST, PUT, PATCH, DELETE
 *
 * USO:
 *   import { api } from "@/core/services/apiService";
 *   const user = await api.get<User>("/auth/me");
 *   const acta = await api.post<Acta>("/formularios/actas", payload);
 */

// ── Constantes ───────────────────────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "cdlatam_auth_token";

// ── Tipos ────────────────────────────────────────────────────────────────────
export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}

export class ApiException extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ApiException";
  }
}

// ── Token helpers ─────────────────────────────────────────────────────────────
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ── Core fetch ────────────────────────────────────────────────────────────────
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...extraHeaders,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 401 → limpiar token y redirigir a login
  if (response.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new ApiException(401, "Sesión expirada. Por favor inicia sesión nuevamente.");
  }

  // Intentar parsear el cuerpo como JSON
  let data: unknown;
  const contentType = response.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const err = data as { message?: string; errors?: Record<string, string[]> };
    throw new ApiException(
      response.status,
      err?.message ?? `Error ${response.status}`,
      err?.errors
    );
  }

  return data as T;
}

// ── API client ────────────────────────────────────────────────────────────────
export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean>) => {
    const url = params
      ? `${path}?${new URLSearchParams(
          Object.fromEntries(
            Object.entries(params).map(([k, v]) => [k, String(v)])
          )
        ).toString()}`
      : path;
    return request<T>("GET", url);
  },

  post: <T>(path: string, body?: unknown) =>
    request<T>("POST", path, body),

  put: <T>(path: string, body?: unknown) =>
    request<T>("PUT", path, body),

  patch: <T>(path: string, body?: unknown) =>
    request<T>("PATCH", path, body),

  delete: <T>(path: string) =>
    request<T>("DELETE", path),
};

// ── Verificar si la API está configurada ──────────────────────────────────────
export function isApiConfigured(): boolean {
  return !!API_BASE_URL && API_BASE_URL.startsWith("http");
}

export { API_BASE_URL };
