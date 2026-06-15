/**
 * features/expedientes/f1/useF1.ts
 *
 * Hook de F1 (Acta). Recibe el expedienteId y expone:
 *   - data: estado actual de F1Data
 *   - status: "nuevo" | "sin_guardar" | "guardado"
 *   - update(partial): actualiza campos y marca sin_guardar
 *   - guardar(): persiste en BD via trpc.actas.syncF1. Devuelve Promise<boolean>
 *               (true si server respondió OK). Solo marca status=guardado tras
 *               éxito real del server (no optimista).
 *   - descartar(): invalida cache tRPC y rehidrata F1 desde BD, descartando
 *                  los cambios pendientes en localStorage.
 *   - isSyncing: true mientras se guarda en BD
 *
 * Si la sincronización con BD falla, status sigue en "sin_guardar" y se muestra
 * un toast rojo. El usuario puede reintentar.
 */
import { useCallback } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { joinPhonePair } from "@/lib/formatters";
import { useExpedienteStore } from "../store";
import { mapDetalleToExpediente } from "../fromServer";
import type { F1Data } from "../types";

export function useF1(expedienteId: number) {
  const store = useExpedienteStore();
  const utils = trpc.useUtils();
  const expediente = store.getExpediente(expedienteId);

  const data    = expediente?.f1.data   ?? null;
  const status  = expediente?.f1.status ?? "nuevo";
  const savedAt = expediente?.f1.savedAt;

  const syncF1Mutation = trpc.actas.syncF1.useMutation({
    onError: (err) => {
      console.warn("[useF1] No se pudo sincronizar F1 con BD:", err.message);
      toast.error("No se pudo sincronizar con el servidor", {
        description: err.message || "Intenta guardar de nuevo en unos segundos.",
      });
    },
  });

  const update = useCallback(
    (partial: Partial<F1Data>) => store.updateF1(expedienteId, partial),
    [expedienteId, store]
  );

  /**
   * guardar() — persiste F1 en BD via tRPC.
   * Solo marca status=guardado si el server respondió OK. Devuelve true en éxito.
   */
  const guardar = useCallback(async (): Promise<boolean> => {
    if (!data) return false;

    const savedIso = new Date().toISOString();
    const { firmaImagen: _omitFirma, ...f1DatosSinFirma } = data;

    try {
      const acta = await syncF1Mutation.mutateAsync({
        expedienteId,
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
        representanteFono: joinPhonePair(data.representanteTelefonoFijo, data.representanteTelefonoMovil),
        contactoTecnico: data.contactoTecnico,
        contactoTecnicoEmail: data.contactoTecnicoEmail,
        contactoTecnicoFono: joinPhonePair(data.contactoTecnicoTelefonoFijo, data.contactoTecnicoTelefonoMovil),
        contactoFacturacion: data.contactoFacturacion,
        contactoFacturacionEmail: data.contactoFacturacionEmail,
        contactoFacturacionFono: joinPhonePair(data.contactoFacturacionTelefonoFijo, data.contactoFacturacionTelefonoMovil),
        serviciosContratados: data.serviciosContratados,
        formasPagoImplementacion: data.formasPagoImplementacion,
        formasPagoMantencion: data.formasPagoMantencion,
        status: "borrador",
        f1Datos: f1DatosSinFirma as Record<string, unknown>,
        f1FormStatus: "guardado",
        f1SavedAt: savedIso,
      });

      // Server confirmó → marcar como guardado y absorber el noActa generado
      // en una sola operación. Si llamáramos updateF1() después de guardarF1(),
      // updateF1 vería status="guardado" y lo regresaría a "sin_guardar"
      // (porque está pensado para cuando el usuario edita un campo). El partial
      // viaja dentro de guardarF1 para evitar ese flicker.
      store.guardarF1(
        expedienteId,
        acta?.noActa ? { noActa: acta.noActa } : undefined,
      );
      // Invalidar la cache de tRPC para que las próximas queries traigan v2.
      // Sin esto, al volver a Historial / Workspace el useQuery devuelve la
      // versión cacheada anterior y eso pisa el store via mergeLista.
      // No await: el store local ya está al día, no demoramos el toast.
      void utils.expediente.detalle.invalidate({ id: expedienteId });
      void utils.expediente.listarResumen.invalidate();
      void utils.expediente.listarResumenWorkspace.invalidate();
      return true;
    } catch {
      // El toast ya se mostró en onError. No tocamos status para que siga ámbar.
      return false;
    }
  }, [data, expedienteId, store, syncF1Mutation]);

  /**
   * descartar() — descarta los cambios locales y vuelve al estado de la BD.
   * Invalida el cache de tRPC y rehidrata F1 con la respuesta fresca del server.
   */
  const descartar = useCallback(async (): Promise<void> => {
    try {
      await utils.expediente.detalle.invalidate({ id: expedienteId });
      const fresh = await utils.expediente.detalle.fetch({ id: expedienteId });
      if (fresh) {
        store.mergeDetalleEnStore(mapDetalleToExpediente(fresh));
      }
    } catch (err) {
      console.warn("[useF1] No se pudo descartar y refrescar desde BD:", err);
      toast.error("No se pudo recuperar la versión guardada");
    }
  }, [utils, expedienteId, store]);

  return {
    data,
    status,
    savedAt,
    update,
    guardar,
    descartar,
    isSyncing: syncF1Mutation.isPending,
  };
}
