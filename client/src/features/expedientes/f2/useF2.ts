/**
 * features/expedientes/f2/useF2.ts
 *
 * Hook de F2 (Evaluación de Proyecto). Recibe el expedienteId y expone:
 *   - data: estado actual de F2Data
 *   - status: "nuevo" | "sin_guardar" | "guardado"
 *   - f1Data: datos de F1 del mismo expediente (para pre-llenado)
 *   - update(partial): actualiza campos y marca sin_guardar
 *   - guardar(): persiste F2 en BD via trpc.evaluaciones.syncF2. Devuelve
 *                Promise<boolean> (true si server respondió OK). Solo marca
 *                status=guardado tras éxito real.
 *   - descartar(): invalida cache tRPC y rehidrata F2 desde BD, descartando
 *                  los cambios pendientes en localStorage.
 *   - isSyncing: true mientras se guarda en BD
 *
 * Pre-llenado desde F1:
 *   Una sola tabla `F1_TO_F2_HEADER_FIELDS` define qué copiar al banner y al botón.
 */
import { useCallback } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useExpedienteStore } from "../store";
import { f2DataToEvalSyncData, mapDetalleToExpediente } from "../fromServer";
import type { F2Data, F1Data } from "../types";

/** Mapeo F1 → campos de encabezado F2 (solo escalares; mismos que antes del refactor). */
const F1_TO_F2_HEADER_FIELDS = [
  { f2: "nombreCliente" as const, f1: "razonSocial" as const },
  { f2: "rut" as const, f1: "rucDniRut" as const },
  { f2: "paisImplementacion" as const, f1: "pais" as const },
  { f2: "tipoMoneda" as const, f1: "moneda" as const },
] as const;

function f1ToF2HeaderPatch(f1: F1Data): Partial<F2Data> {
  const patch: Partial<F2Data> = {};
  for (const { f1: fk, f2: tk } of F1_TO_F2_HEADER_FIELDS) {
    (patch as Record<string, unknown>)[tk] = f1[fk] as string;
  }
  return patch;
}

/** Objeto para banner «Importar desde F1» (mismas claves que F2InfoGeneral espera). */
function f1ImportSuggestions(f1: F1Data | null) {
  if (!f1) return null;
  const s: Record<string, string> = {};
  for (const { f1: fk, f2: tk } of F1_TO_F2_HEADER_FIELDS) {
    s[tk] = f1[fk] ?? "";
  }
  return s as {
    nombreCliente: string;
    rut: string;
    paisImplementacion: string;
    tipoMoneda: string;
  };
}

export function useF2(expedienteId: string) {
  const store = useExpedienteStore();
  const utils = trpc.useUtils();
  const expediente = store.getExpediente(expedienteId);

  const syncF2Mutation = trpc.evaluaciones.syncF2.useMutation({
    onError: (err) => {
      console.warn("[useF2] No se pudo sincronizar F2 con BD:", err.message);
      toast.error("No se pudo sincronizar con el servidor", {
        description: err.message || "Intenta guardar de nuevo en unos segundos.",
      });
    },
  });

  const data    = expediente?.f2.data   ?? null;
  const status  = expediente?.f2.status ?? "nuevo";
  const savedAt = expediente?.f2.savedAt;

  /** Datos de F1 del mismo expediente — disponibles para pre-llenado */
  const f1Data: F1Data | null = expediente?.f1.data ?? null;

  const f1Suggestions = f1ImportSuggestions(f1Data);

  const update = useCallback(
    (partial: Partial<F2Data>) => store.updateF2(expedienteId, partial),
    [expedienteId, store]
  );

  const guardar = useCallback(async (): Promise<boolean> => {
    if (!data) return false;
    const savedIso = new Date().toISOString();

    try {
      await syncF2Mutation.mutateAsync({
        expedienteUuid: expedienteId,
        f2FormStatus: "guardado",
        f2SavedAt: savedIso,
        data: f2DataToEvalSyncData(data),
      });
      // Server confirmó → marcar guardado (también marca F3 como sin_guardar)
      store.guardarF2(expedienteId);
      // Invalidar la cache de tRPC para que las próximas queries traigan v2.
      // Sin esto, al volver a Historial / Workspace el useQuery devuelve la
      // versión cacheada anterior y eso pisa el store via mergeLista.
      // No await: el store local ya está al día, no demoramos el toast.
      void utils.expediente.detalle.invalidate({ uuid: expedienteId });
      void utils.expediente.listarResumen.invalidate();
      void utils.expediente.listarResumenWorkspace.invalidate();
      return true;
    } catch {
      return false;
    }
  }, [data, expedienteId, store, syncF2Mutation]);

  /**
   * descartar() — descarta los cambios locales y vuelve al estado de la BD.
   * Invalida el cache de tRPC y rehidrata F2 con la respuesta fresca del server.
   */
  const descartar = useCallback(async (): Promise<void> => {
    try {
      await utils.expediente.detalle.invalidate({ uuid: expedienteId });
      const fresh = await utils.expediente.detalle.fetch({ uuid: expedienteId });
      if (fresh) {
        store.mergeDetalleEnStore(mapDetalleToExpediente(fresh));
      }
    } catch (err) {
      console.warn("[useF2] No se pudo descartar y refrescar desde BD:", err);
      toast.error("No se pudo recuperar la versión guardada");
    }
  }, [utils, expedienteId, store]);

  /** Importa al F2 los campos de encabezado definidos en F1_TO_F2_HEADER_FIELDS. */
  const importarDesdeF1 = useCallback(() => {
    if (!f1Data) return;
    update(f1ToF2HeaderPatch(f1Data));
  }, [f1Data, update]);

  return {
    data,
    status,
    savedAt,
    f1Data,
    f1Suggestions,
    update,
    guardar,
    descartar,
    importarDesdeF1,
    isSyncing: syncF2Mutation.isPending,
  };
}
