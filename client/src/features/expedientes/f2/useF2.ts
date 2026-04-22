/**
 * features/expedientes/f2/useF2.ts
 *
 * Hook de F2 (Evaluación de Proyecto). Recibe el expedienteId y expone:
 *   - data: estado actual de F2Data
 *   - status: "nuevo" | "sin_guardar" | "guardado"
 *   - f1Data: datos de F1 del mismo expediente (para pre-llenado)
 *   - update(partial): actualiza campos y marca sin_guardar
 *   - guardar(): persiste y marca guardado (también marca F3 como sin_guardar)
 *
 * Pre-llenado desde F1:
 *   - f1Data.razonSocial → F2.nombreCliente
 *   - f1Data.rucDniRut   → F2.rut
 *   - f1Data.pais        → F2.paisImplementacion
 *   - f1Data.moneda      → F2.tipoMoneda
 *
 * Para conectar con tRPC en el futuro, reemplazar guardar() con:
 *   await trpc.evaluaciones.create.mutate(data)
 *   await trpc.evaluaciones.update.mutate({ id, data })
 */
import { useCallback } from "react";
import { useExpedienteStore } from "../store";
import type { F2Data, F1Data } from "../types";

export function useF2(expedienteId: string) {
  const store = useExpedienteStore();
  const expediente = store.getExpediente(expedienteId);

  const data    = expediente?.f2.data   ?? null;
  const status  = expediente?.f2.status ?? "nuevo";
  const savedAt = expediente?.f2.savedAt;

  /** Datos de F1 del mismo expediente — disponibles para pre-llenado */
  const f1Data: F1Data | null = expediente?.f1.data ?? null;

  /**
   * Campos de F1 que se pueden pre-llenar en F2.
   * Úsalos en F2Form para mostrar un botón "Importar desde F1".
   */
  const f1Suggestions = f1Data ? {
    nombreCliente:     f1Data.razonSocial,
    rut:               f1Data.rucDniRut,
    paisImplementacion: f1Data.pais,
    tipoMoneda:        f1Data.moneda,
  } : null;

  const update = useCallback(
    (partial: Partial<F2Data>) => store.updateF2(expedienteId, partial),
    [expedienteId, store]
  );

  const guardar = useCallback(
    () => store.guardarF2(expedienteId),
    [expedienteId, store]
  );

  /** Importa los campos sugeridos de F1 a F2 de una sola vez */
  const importarDesdeF1 = useCallback(() => {
    if (!f1Suggestions) return;
    update(f1Suggestions);
  }, [f1Suggestions, update]);

  return { data, status, savedAt, f1Data, f1Suggestions, update, guardar, importarDesdeF1 };
}
