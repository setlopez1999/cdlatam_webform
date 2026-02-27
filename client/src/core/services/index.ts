/**
 * services/index.ts — Barrel de exportación de todos los servicios
 *
 * Importa desde aquí para acceder a cualquier servicio:
 *   import { authService, formulariosService, catalogsService, adminService } from "@/core/services";
 */

export { api, isApiConfigured, getToken, setToken, clearToken } from "./apiService";
export type { ApiError, ApiException } from "./apiService";

export { authService } from "./authService";
export type { AuthUser, LoginRequest, LoginResponse } from "./authService";

export { catalogsService } from "./catalogsService";
export type { CatalogItem, AllCatalogs } from "./catalogsService";

export { formulariosService } from "./formulariosService";
export type {
  ActaData,
  ActaServicio,
  FormaPago,
  EPData,
  EPLineItem,
  EPRrhhItem,
  EPOtrosItem,
  HistorialItem,
  FormStatus,
} from "./formulariosService";

export { adminService } from "./adminService";
export type { AdminUser, CreateUserRequest, UpdateUserRequest, BdStats } from "./adminService";
