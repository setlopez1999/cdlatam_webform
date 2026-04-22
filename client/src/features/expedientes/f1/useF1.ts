/**
 * features/expedientes/f1/useF1.ts
 *
 * Hook de F1 (Acta). Recibe el expedienteId y expone:
 *   - data: estado actual de F1Data
 *   - status: "nuevo" | "sin_guardar" | "guardado"
 *   - update(partial): actualiza campos y marca sin_guardar
 *   - guardar(): persiste y marca guardado
 *
 * Para conectar con tRPC en el futuro, reemplazar guardar() con:
 *   await trpc.actas.create.mutate(data)  (si no tiene id)
 *   await trpc.actas.update.mutate({ id, data })  (si ya tiene id)
 */
import { useCallback } from "react";
import { useExpedienteStore } from "../store";
import type { F1Data } from "../types";

export function useF1(expedienteId: string) {
  const store = useExpedienteStore();
  const expediente = store.getExpediente(expedienteId);

  const data   = expediente?.f1.data   ?? null;
  const status = expediente?.f1.status ?? "nuevo";
  const savedAt = expediente?.f1.savedAt;

  const update = useCallback(
    (partial: Partial<F1Data>) => store.updateF1(expedienteId, partial),
    [expedienteId, store]
  );

  const guardar = useCallback(
    () => store.guardarF1(expedienteId),
    [expedienteId, store]
  );

  return { data, status, savedAt, update, guardar };
}
