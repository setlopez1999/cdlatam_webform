/**
 * features/expedientes/f1/useF1.ts
 *
 * Hook de F1 (Acta). Recibe el expedienteId y expone:
 *   - data: estado actual de F1Data
 *   - status: "nuevo" | "sin_guardar" | "guardado"
 *   - update(partial): actualiza campos y marca sin_guardar
 *   - guardar(): persiste en localStorage Y sincroniza con BD via tRPC
 *   - isSyncing: true mientras se guarda en BD
 *
 * Al guardar, llama trpc.actas.syncF1 con el expedienteUuid y todos los campos de F1.
 * Si la sincronización falla, el estado local sigue como "guardado" (el acta vive en localStorage).
 */
import { useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useExpedienteStore } from "../store";
import type { F1Data } from "../types";

export function useF1(expedienteId: string) {
  const store = useExpedienteStore();
  const expediente = store.getExpediente(expedienteId);

  const data    = expediente?.f1.data   ?? null;
  const status  = expediente?.f1.status ?? "nuevo";
  const savedAt = expediente?.f1.savedAt;

  // Mutation para sincronizar F1 con la BD
  const syncF1Mutation = trpc.actas.syncF1.useMutation({
    onSuccess: (acta) => {
      if (acta?.noActa) {
        store.updateF1(expedienteId, { noActa: acta.noActa });
      }
    },
    onError: (err) => {
      console.warn("[useF1] No se pudo sincronizar F1 con BD:", err.message);
      // No revertir el estado local — el acta sigue guardada en localStorage
    },
  });

  const update = useCallback(
    (partial: Partial<F1Data>) => store.updateF1(expedienteId, partial),
    [expedienteId, store]
  );

  /**
   * guardar() — persiste F1 en localStorage y sincroniza con BD.
   * 1. Marca el estado local como "guardado" (inmediato, para UX fluida)
   * 2. Llama trpc.actas.syncF1 en background (fire-and-forget)
   */
  const guardar = useCallback(() => {
    if (!data) return;

    // 1. Persistir en localStorage (siempre, independiente de BD)
    store.guardarF1(expedienteId);

    const savedIso = new Date().toISOString();
    const { firmaImagen: _omitFirma, ...f1DatosSinFirma } = data;
    // 2. Sincronizar con BD en background (snapshot F1 sin firma; el PDF usa hueco vacío)
    syncF1Mutation.mutate({
      expedienteUuid: expedienteId,
      noActa: data.noActa,
      atencion: data.atencion,
      fecha: data.fecha,
      razonSocial: data.razonSocial,
      nombreFantasia: data.nombreFantasia,
      rucDniRut: data.rucDniRut,
      direccionComercial: data.direccionComercial,
      representanteLegal: data.representanteLegal,
      representanteDni: data.representanteDni,
      representanteEmail: data.representanteEmail,
      representanteFono: data.representanteTelefonoFijo,
      contactoTecnico: data.contactoTecnico,
      contactoTecnicoEmail: data.contactoTecnicoEmail,
      contactoTecnicoFono: data.contactoTecnicoTelefonoFijo,
      contactoFacturacion: data.contactoFacturacion,
      contactoFacturacionEmail: data.contactoFacturacionEmail,
      contactoFacturacionFono: data.contactoFacturacionTelefonoFijo,
      serviciosContratados: data.serviciosContratados,
      formasPagoImplementacion: data.formasPagoImplementacion,
      formasPagoMantencion: data.formasPagoMantencion,
      status: "borrador",
      f1Datos: f1DatosSinFirma as Record<string, unknown>,
      f1FormStatus: "guardado",
      f1SavedAt: savedIso,
    });
  }, [data, expedienteId, store, syncF1Mutation]);

  return {
    data,
    status,
    savedAt,
    update,
    guardar,
    isSyncing: syncF1Mutation.isPending,
  };
}
