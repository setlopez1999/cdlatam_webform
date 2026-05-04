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
import { trpc } from "@/lib/trpc";
import { useExpedienteStore } from "../store";
import { f2DataToEvalSyncData } from "../fromServer";
import type { F2Data, F1Data } from "../types";

export function useF2(expedienteId: string) {
  const store = useExpedienteStore();
  const expediente = store.getExpediente(expedienteId);

  const syncF2Mutation = trpc.evaluaciones.syncF2.useMutation({
    onError: (err) => {
      console.warn("[useF2] No se pudo sincronizar F2 con BD:", err.message);
    },
  });

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

  const guardar = useCallback(() => {
    if (!data) return;
    const savedIso = new Date().toISOString();
    store.guardarF2(expedienteId);
    syncF2Mutation.mutate({
      expedienteUuid: expedienteId,
      f2FormStatus: "guardado",
      f2SavedAt: savedIso,
      data: f2DataToEvalSyncData(data),
    });
  }, [data, expedienteId, store, syncF2Mutation]);

  /** Importa los campos sugeridos de F1 a F2 de una sola vez */
  const importarDesdeF1 = useCallback(() => {
    if (!f1Suggestions) return;
    update(f1Suggestions);
  }, [f1Suggestions, update]);

  return {
    data,
    status,
    savedAt,
    f1Data,
    f1Suggestions,
    update,
    guardar,
    importarDesdeF1,
    isSyncing: syncF2Mutation.isPending,
  };
}
