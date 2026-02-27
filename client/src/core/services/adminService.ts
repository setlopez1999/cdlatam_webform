/**
 * adminService.ts — Servicio de administración (solo rol admin) via API REST
 *
 * Endpoints consumidos:
 *
 * USUARIOS:
 *   GET    /admin/usuarios                       → lista todos los usuarios
 *   GET    /admin/usuarios/:id                   → detalle de un usuario
 *   POST   /admin/usuarios                       → crear nuevo usuario
 *   PUT    /admin/usuarios/:id                   → actualizar usuario
 *   PATCH  /admin/usuarios/:id/role              → cambiar rol del usuario
 *   PATCH  /admin/usuarios/:id/status            → activar/desactivar usuario
 *   DELETE /admin/usuarios/:id                   → eliminar usuario
 *
 * BASE DE DATOS (catálogos):
 *   GET    /admin/bd/stats                       → estadísticas generales
 *   GET    /admin/bd/actas                       → todas las actas (admin ve todo)
 *   GET    /admin/bd/eps                         → todos los EPs (admin ve todo)
 *   POST   /admin/bd/catalogs/invalidate         → forzar recarga de catálogos
 *
 * HISTORIAL GLOBAL:
 *   GET    /admin/historial                      → historial de todos los usuarios
 *   GET    /admin/historial?userId=:id           → historial de un usuario específico
 *
 * TODO: Conectar con API de Base de Datos aquí — todos estos endpoints
 *       requieren rol admin (el token JWT debe tener role: "admin").
 */

import { api, isApiConfigured } from "./apiService";
import type { AuthUser } from "./authService";
import type { ActaData, EPData, HistorialItem } from "./formulariosService";

// ── Tipos ─────────────────────────────────────────────────────────────────────
export interface AdminUser extends AuthUser {
  isActive: boolean;
  creadoEn?: string;
  ultimoAcceso?: string;
  totalFormularios?: number;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  nombre?: string;
  email?: string;
  role: "admin" | "user";
}

export interface UpdateUserRequest {
  nombre?: string;
  email?: string;
}

export interface BdStats {
  totalActas: number;
  totalEPs: number;
  totalUsuarios: number;
  actasPorEstado: Record<string, number>;
  epsPorEstado: Record<string, number>;
  actividadReciente: HistorialItem[];
}

// ── Servicio ──────────────────────────────────────────────────────────────────
export const adminService = {
  // ── USUARIOS ───────────────────────────────────────────────────────────────

  /** Lista todos los usuarios del sistema */
  async listUsuarios(): Promise<AdminUser[]> {
    // TODO: Conectar con API de Base de Datos aquí
    if (isApiConfigured()) {
      return api.get<AdminUser[]>("/admin/usuarios");
    }
    // Fallback: retorna lista vacía si no hay API
    return [];
  },

  /** Crea un nuevo usuario */
  async createUsuario(data: CreateUserRequest): Promise<AdminUser> {
    // TODO: Conectar con API de Base de Datos aquí
    if (isApiConfigured()) {
      return api.post<AdminUser>("/admin/usuarios", data);
    }
    throw new Error("Creación de usuarios requiere API configurada");
  },

  /** Actualiza datos básicos de un usuario */
  async updateUsuario(id: string | number, data: UpdateUserRequest): Promise<AdminUser> {
    // TODO: Conectar con API de Base de Datos aquí
    if (isApiConfigured()) {
      return api.put<AdminUser>(`/admin/usuarios/${id}`, data);
    }
    throw new Error("Actualización de usuarios requiere API configurada");
  },

  /** Cambia el rol de un usuario */
  async changeRole(id: string | number, role: "admin" | "user"): Promise<void> {
    // TODO: Conectar con API de Base de Datos aquí
    if (isApiConfigured()) {
      return api.patch(`/admin/usuarios/${id}/role`, { role });
    }
    throw new Error("Cambio de rol requiere API configurada");
  },

  /** Activa o desactiva un usuario */
  async toggleStatus(id: string | number, isActive: boolean): Promise<void> {
    // TODO: Conectar con API de Base de Datos aquí
    if (isApiConfigured()) {
      return api.patch(`/admin/usuarios/${id}/status`, { isActive });
    }
    throw new Error("Cambio de estado requiere API configurada");
  },

  /** Elimina un usuario */
  async deleteUsuario(id: string | number): Promise<void> {
    // TODO: Conectar con API de Base de Datos aquí
    if (isApiConfigured()) {
      return api.delete(`/admin/usuarios/${id}`);
    }
    throw new Error("Eliminación de usuarios requiere API configurada");
  },

  /** Cambia la contraseña de un usuario (solo admin) */
  async resetPassword(id: string | number, newPassword: string): Promise<void> {
    // TODO: Conectar con API de Base de Datos aquí
    if (isApiConfigured()) {
      return api.patch(`/admin/usuarios/${id}/password`, { newPassword });
    }
    throw new Error("Reset de contraseña requiere API configurada");
  },

  // ── BASE DE DATOS ──────────────────────────────────────────────────────────

  /** Estadísticas generales del sistema */
  async getStats(): Promise<BdStats> {
    // TODO: Conectar con API de Base de Datos aquí
    if (isApiConfigured()) {
      return api.get<BdStats>("/admin/bd/stats");
    }
    return {
      totalActas: 0,
      totalEPs: 0,
      totalUsuarios: 0,
      actasPorEstado: {},
      epsPorEstado: {},
      actividadReciente: [],
    };
  },

  /** Obtiene todas las actas (admin ve las de todos los usuarios) */
  async getAllActas(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: ActaData[]; total: number }> {
    // TODO: Conectar con API de Base de Datos aquí
    if (isApiConfigured()) {
      return api.get<{ items: ActaData[]; total: number }>("/admin/bd/actas", params);
    }
    return { items: [], total: 0 };
  },

  /** Obtiene todos los EPs (admin ve los de todos los usuarios) */
  async getAllEPs(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: EPData[]; total: number }> {
    // TODO: Conectar con API de Base de Datos aquí
    if (isApiConfigured()) {
      return api.get<{ items: EPData[]; total: number }>("/admin/bd/eps", params);
    }
    return { items: [], total: 0 };
  },

  /** Historial global de todos los usuarios */
  async getHistorialGlobal(userId?: string | number): Promise<HistorialItem[]> {
    // TODO: Conectar con API de Base de Datos aquí
    if (isApiConfigured()) {
      return api.get<HistorialItem[]>("/admin/historial", userId ? { userId } : undefined);
    }
    return [];
  },
};
