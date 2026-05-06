/**
 * Roles que pueden ver/editar cualquier expediente (workspace global).
 * Mantener alineado con ACTION_PERMISSIONS.expedientes:workspace_global en el cliente.
 */
export const EXPEDIENTES_WORKSPACE_GLOBAL_ROLES = ["admin"] as const;

export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
