/**
 * useFieldVisibility — Hook de visibilidad de campos sensibles en F1-Acta
 *
 * Determina si el usuario actual tiene acceso a los campos sensibles de un acta:
 *   - Consideraciones personalizadas y cláusulas legales
 *   - Formas de pago (montos, cuotas)
 *   - Servicios (valores unitarios, totales, descuentos)
 *
 * Reglas de visibilidad (definidas en permissions.ts → "expediente:view_sensitive_fields"):
 *   - admin / perfil_full / manager → siempre ve todo
 *   - Creador del acta              → ve todo (independiente del rol)
 *   - Otro usuario con perfil_ventas → solo ve servicios básicos, SIN montos ni consideraciones
 *
 * Fuente única de verdad: `useCan("expediente:view_sensitive_fields")` via permissions.ts.
 * NO hay roles hardcodeados en este hook.
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
import { useCan } from "./useCan";

/**
 * @param actaCreadorId - ID del usuario que creó el acta (undefined si aún no persiste en BD)
 * @returns canViewSensitiveFields — true si el usuario puede ver campos sensibles
 */
export function useFieldVisibility(actaCreadorId?: number | string) {
  const { currentUser } = useLocalAuth();
  const can = useCan();

  // Roles con acceso completo (definidos en permissions.ts → "expediente:view_sensitive_fields")
  if (can("expediente:view_sensitive_fields")) {
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
