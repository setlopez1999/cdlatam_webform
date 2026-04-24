/**
 * useFieldVisibility — Hook de visibilidad de campos sensibles en F1-Acta
 *
 * Determina si el usuario actual tiene acceso a los campos sensibles de un acta:
 *   - Consideraciones personalizadas y cláusulas legales
 *   - Formas de pago (montos, cuotas)
 *   - Servicios (valores unitarios, totales, descuentos)
 *
 * Reglas de visibilidad:
 *   - admin / perfil_full / manager → siempre ve todo
 *   - Creador del acta              → ve todo (independiente del rol)
 *   - Otro usuario con perfil_ventas → solo ve servicios básicos, SIN montos ni consideraciones
 *
 * Uso:
 *   const { canViewSensitiveFields } = useFieldVisibility(actaCreadorId);
 *   {!canViewSensitiveFields && <RestrictedPlaceholder />}
 *
 * Para el futuro (cuando los expedientes persistan en BD):
 *   Reemplazar `actaCreadorId` con el `creadorId` del expediente desde la BD.
 *   Ver: doc/pendiente-integridad-expedientes.md
 */

import { useLocalAuth } from "./useLocalAuth";

const ROLES_FULL_ACCESS = ["admin", "perfil_full", "manager"];

/**
 * @param actaCreadorId - ID del usuario que creó el acta (undefined si aún no persiste en BD)
 * @returns canViewSensitiveFields — true si el usuario puede ver campos sensibles
 */
export function useFieldVisibility(actaCreadorId?: number | string) {
  const { currentUser, hasAnyRole } = useLocalAuth();

  // Admins y roles con acceso completo siempre ven todo
  if (hasAnyRole(ROLES_FULL_ACCESS)) {
    return { canViewSensitiveFields: true };
  }

  // Si el acta aún no tiene creador asignado (localStorage, sin BD), el usuario actual puede verlo
  if (actaCreadorId === undefined || actaCreadorId === null) {
    return { canViewSensitiveFields: true };
  }

  // El creador del acta siempre ve sus propios campos
  const isSelf = Number(currentUser?.id) === Number(actaCreadorId);
  return { canViewSensitiveFields: isSelf };
}
