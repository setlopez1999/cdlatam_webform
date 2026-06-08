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
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  useExpedienteStore,
  getExpedienteFromState,
  storeUpdateF2,
  storeGuardarF2,
  storeMergeDetalleEnStore,
} from "../store";
import { f2DataToEvalSyncData, mapDetalleToExpediente } from "../fromServer";
import { sanitizeF2Cuotas } from "../f1/f1ImplementacionCuotas";
import type { F2Data, F1Data } from "../types";

/** Mapeo F1 → campos de encabezado F2 (solo escalares; mismos que antes del refactor). */
const F1_TO_F2_HEADER_FIELDS = [
  { f2: "nombreCliente" as const, f1: "razonSocial" as const },
  { f2: "empresa" as const, f1: "razonSocial" as const },
  { f2: "nombreFantasia" as const, f1: "nombreFantasia" as const },
  { f2: "rut" as const, f1: "rucDniRut" as const },
  { f2: "paisImplementacion" as const, f1: "pais" as const },
  { f2: "tipoMoneda" as const, f1: "moneda" as const },
  // Campo "Atención" de F1 (catalog_nombres) → Ejecutivo Comercial y Preventa de F2
  { f2: "ejecutivoComercial" as const, f1: "atencion" as const },
  { f2: "preventa" as const, f1: "atencion" as const },
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
  const s: Record<string, string | number> = {};
  for (const { f1: fk, f2: tk } of F1_TO_F2_HEADER_FIELDS) {
    s[tk] = f1[fk] ?? "";
  }
  // Agrega sugerencias de la primera fila de servicios contratados
  const primeraFila = f1.serviciosContratados?.[0];
  if (primeraFila) {
    s["unidadNegocios"]     = primeraFila.unidadNegocio ?? "";
    s["solucion"]           = primeraFila.solucion ?? "";
    s["plazoImplementacion"] = primeraFila.plazo ?? "";
  }
  // Monto de implementación: suma de totales de servicios tipo Implementación
  const totalImpl = f1.serviciosContratados
    ?.filter(s => s.tipoVenta?.toLowerCase().includes("impl"))
    .reduce((acc, s) => acc + (s.total ?? 0), 0) ?? 0;
  if (totalImpl > 0) s["montoProyecto"] = totalImpl;
  return s as {
    nombreCliente: string;
    empresa: string;
    nombreFantasia: string;
    rut: string;
    paisImplementacion: string;
    tipoMoneda: string;
    unidadNegocios: string;
    solucion: string;
    plazoImplementacion: string;
    montoProyecto: number;
  };
}

export function useF2(expedienteId: string) {
  const { getExpediente } = useExpedienteStore();
  const utils = trpc.useUtils();
  const expediente = getExpediente(expedienteId);

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

  const f1Suggestions = useMemo(() => f1ImportSuggestions(f1Data), [f1Data]);

  const update = useCallback(
    (partial: Partial<F2Data>) => storeUpdateF2(expedienteId, partial),
    [expedienteId],
  );

  /**
   * guardar(derivedOverride?) — persiste F2 en BD.
   * Si se pasa `derivedOverride`, usa esos datos en lugar del store (evita el
   * problema de race condition entre flushDerived() y el estado de React).
   */
  const guardar = useCallback(async (derivedOverride?: Partial<F2Data>): Promise<boolean> => {
    // Leer del singleton directamente para evitar stale closure del snapshot de React.
    // El singleton se actualiza síncronamente cuando el usuario edita un campo.
    const freshExp = getExpedienteFromState(expedienteId);
    const freshData = freshExp?.f2.data ?? data;
    if (!freshData) return false;
    const merged: F2Data = derivedOverride ? { ...freshData, ...derivedOverride } : freshData;
    const dataToSave = sanitizeF2Cuotas(merged, freshExp?.f1.data ?? f1Data);
    const savedIso = new Date().toISOString();

    try {
      await syncF2Mutation.mutateAsync({
        expedienteUuid: expedienteId,
        f2FormStatus: "guardado",
        f2SavedAt: savedIso,
        data: f2DataToEvalSyncData(dataToSave),
      });
      // Server confirmó → marcar guardado con los datos derivados (también marca F3 como sin_guardar)
      storeGuardarF2(expedienteId, dataToSave);
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
  }, [data, f1Data, expedienteId, syncF2Mutation, utils]);

  /**
   * descartar() — descarta los cambios locales y vuelve al estado de la BD.
   * Invalida el cache de tRPC y rehidrata F2 con la respuesta fresca del server.
   */
  const descartar = useCallback(async (): Promise<void> => {
    try {
      await utils.expediente.detalle.invalidate({ uuid: expedienteId });
      const fresh = await utils.expediente.detalle.fetch({ uuid: expedienteId });
      if (fresh) {
        storeMergeDetalleEnStore(mapDetalleToExpediente(fresh));
      }
    } catch (err) {
      console.warn("[useF2] No se pudo descartar y refrescar desde BD:", err);
      toast.error("No se pudo recuperar la versión guardada");
    }
  }, [utils, expedienteId]);

  /** Importa al F2 los campos de encabezado definidos en F1_TO_F2_HEADER_FIELDS
   *  más solucion, unidadNegocios, plazoImplementacion y montoProyecto desde F1. */
  const importarDesdeF1 = useCallback(() => {
    if (!f1Data) return;
    const patch = f1ToF2HeaderPatch(f1Data);
    // Importar desde la primera fila de servicios contratados
    const primeraFila = f1Data.serviciosContratados?.[0];
    if (primeraFila) {
      if (primeraFila.unidadNegocio) patch.unidadNegocios      = primeraFila.unidadNegocio;
      if (primeraFila.solucion)      patch.solucion            = primeraFila.solucion;
      if (primeraFila.plazo)         patch.plazoImplementacion = primeraFila.plazo;
    }
    // Monto de implementación: suma de totales de servicios tipo Implementación
    const totalImpl = f1Data.serviciosContratados
      ?.filter(s => s.tipoVenta?.toLowerCase().includes("impl"))
      .reduce((acc, s) => acc + (s.total ?? 0), 0) ?? 0;
    if (totalImpl > 0) patch.montoProyecto = totalImpl;
    update(patch);
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
