/**
 * features/expedientes/store.ts
 *
 * Store central del módulo de Expedientes.
 * Persiste en localStorage como JSON bajo la clave STORAGE_KEY.
 *
 * Para migrar a tRPC en el futuro:
 *   - Reemplazar las llamadas a _persist() por mutations de tRPC
 *   - El shape de Expediente ya mapea 1:1 con los schemas del servidor
 */
import { useCallback, useSyncExternalStore } from "react";
import { nanoid } from "nanoid";
import type { Expediente, F1Data, F2Data, FormStatus } from "./types";
import { F1_INITIAL, F2_INITIAL } from "./types";

// ─── Constantes ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "cdlatam_expedientes";
const ACTIVE_KEY  = "cdlatam_expediente_activo";

// ─── Helpers de persistencia ─────────────────────────────────────────────────

function _load(): Expediente[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Expediente[]) : [];
  } catch {
    return [];
  }
}

function _persist(list: Expediente[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("[ExpedienteStore] Error persisting:", e);
  }
}

function _loadActivo(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

function _persistActivo(id: string | null): void {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

// ─── Factory ──────────────────────────────────────────────────────────────────

function _crearExpediente(nombre?: string): Expediente {
  const list = _load();
  const num  = list.length + 1;
  const now  = new Date().toISOString();
  return {
    id: nanoid(),
    nombre: nombre ?? `Expediente #${num}`,
    f1: { data: { ...F1_INITIAL }, status: "nuevo" },
    f2: { data: { ...F2_INITIAL }, status: "nuevo" },
    f3: { status: "nuevo" },
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Store singleton (module-scoped) ─────────────────────────────────────────
//
// IMPORTANTE: el estado vive en el módulo, NO en cada componente. Antes este
// hook usaba `useState` interno, lo que creaba una copia INDEPENDIENTE del
// estado por cada componente que llamaba `useExpedienteStore()`. Por eso el
// badge de F1 no se actualizaba: `useF1` (instancia A) hacía `setExpedientes`
// pero `ExpedienteLayout` (instancia B) tenía su propia copia y no se
// enteraba — solo se sincronizaban tras un reload (porque ambos leen desde
// localStorage al montar).
//
// La solución es un store singleton suscrito por `useSyncExternalStore`: todas
// las instancias del hook leen del mismo `_state` y se re-renderizan a la vez
// cuando cambia. La API pública del hook queda igual.

let _state: Expediente[] = _load();
const _listeners = new Set<() => void>();

function _setState(updater: (prev: Expediente[]) => Expediente[]): void {
  const next = updater(_state);
  if (next === _state) return;
  _state = next;
  _persist(_state);
  _listeners.forEach((l) => l());
}

function _subscribe(listener: () => void): () => void {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

function _getSnapshot(): Expediente[] {
  return _state;
}

/** Lee un expediente directamente del singleton (sin esperar el ciclo de render de React). */
export function getExpedienteFromState(id: string): Expediente | undefined {
  return _state.find(e => e.id === id);
}

// ─── Hook principal ───────────────────────────────────────────────────────────

/**
 * useExpedienteStore
 *
 * Hook central que expone toda la lógica de expedientes.
 * Úsalo en cualquier componente que necesite leer o modificar expedientes.
 *
 * Ejemplo de uso:
 *   const { expedientes, crear, guardarF1, getExpediente } = useExpedienteStore();
 */
export function useExpedienteStore() {
  // Suscripción al singleton: todas las instancias del hook leen el mismo
  // `_state` y se re-renderizan cuando _setState() notifica a los listeners.
  const expedientes = useSyncExternalStore(_subscribe, _getSnapshot, _getSnapshot);

  // ── Helpers internos ──────────────────────────────────────────────────────

  const _update = useCallback((id: string, updater: (exp: Expediente) => Expediente) => {
    _setState(prev =>
      prev.map(e => (e.id === id ? updater({ ...e, updatedAt: new Date().toISOString() }) : e)),
    );
  }, []);

  // ── CRUD de expedientes ───────────────────────────────────────────────────

  /** Crea un nuevo expediente y lo devuelve */
  const crear = useCallback((nombre?: string): Expediente => {
    const exp = _crearExpediente(nombre);
    _setState(prev => [...prev, exp]);
    _persistActivo(exp.id);
    return exp;
  }, []);

  /** Elimina un expediente por id (solo cliente; el servidor debe borrarse aparte). */
  const eliminar = useCallback((id: string) => {
    _setState(prev => prev.filter(e => e.id !== id));
  }, []);

  /**
   * Mergea la lista del servidor en el store local, respetando los expedientes
   * locales que tienen cambios `sin_guardar` (NO los pisa con la versión del
   * server). Esta es la operación correcta tras `expediente.listarResumen`:
   *
   * - Si el server trae un expediente que el local marca como `sin_guardar`,
   *   se mantiene el local (el usuario tiene cambios pendientes que aún no
   *   llegaron al server).
   * - En cualquier otro caso (local `nuevo` o `guardado`, o no existe), se usa
   *   la versión del server como fuente de verdad.
   *
   * NOTA: la firma se mantiene compatible con el antiguo
   * `reemplazarListaDesdeServidor` para minimizar cambios en consumidores.
   */
  const mergeListaDesdeServidor = useCallback((list: Expediente[]) => {
    _setState(prev => {
      return list.map(serverExp => {
        const local = prev.find(e => e.id === serverExp.id);
        if (!local) return serverExp;
        const tieneCambiosPendientes =
          local.f1.status === "sin_guardar" || local.f2.status === "sin_guardar";
        return tieneCambiosPendientes ? local : serverExp;
      });
    });
  }, []);

  /** Inserta o actualiza un expediente desde `expediente.detalle`. */
  const mergeDetalleEnStore = useCallback((exp: Expediente) => {
    _setState(prev => {
      const idx = prev.findIndex(e => e.id === exp.id);
      return idx >= 0 ? prev.map(e => (e.id === exp.id ? exp : e)) : [...prev, exp];
    });
  }, []);

  /** Renombra un expediente */
  const renombrar = useCallback((id: string, nombre: string) => {
    _update(id, e => ({ ...e, nombre }));
  }, [_update]);

  /** Obtiene un expediente por id */
  const getExpediente = useCallback((id: string): Expediente | undefined => {
    return expedientes.find(e => e.id === id);
  }, [expedientes]);

  // ── F1 ────────────────────────────────────────────────────────────────────

  /**
   * Marca F1 como "sin_guardar" cuando el usuario modifica un campo.
   * Llama a esto desde el onChange de cualquier campo de F1.
   */
  const updateF1 = useCallback((id: string, partial: Partial<F1Data>) => {
    _update(id, e => ({
      ...e,
      f1: {
        ...e.f1,
        data: { ...e.f1.data, ...partial },
        // Si estaba guardado y hay cambios → sin_guardar
        status: e.f1.status === "guardado" ? "sin_guardar" : e.f1.status === "nuevo" ? "sin_guardar" : e.f1.status,
      },
    }));
  }, [_update]);

  /**
   * Guarda F1 — cambia status a "guardado" y registra savedAt.
   * Acepta un `partial` opcional para mergear datos que vienen del server
   * (p. ej. el `noActa` autogenerado) sin tener que llamar `updateF1`
   * después, que regresaría el status a `sin_guardar`.
   */
  const guardarF1 = useCallback((id: string, partial?: Partial<F1Data>) => {
    _update(id, e => ({
      ...e,
      f1: {
        ...e.f1,
        data: partial ? { ...e.f1.data, ...partial } : e.f1.data,
        status: "guardado",
        savedAt: new Date().toISOString(),
      },
    }));
  }, [_update]);

  // ── F2 ────────────────────────────────────────────────────────────────────

  /** Marca F2 como "sin_guardar" cuando el usuario modifica un campo. */
  const updateF2 = useCallback((id: string, partial: Partial<F2Data>) => {
    _update(id, e => ({
      ...e,
      f2: {
        ...e.f2,
        data: { ...e.f2.data, ...partial },
        status: e.f2.status === "guardado" ? "sin_guardar" : e.f2.status === "nuevo" ? "sin_guardar" : e.f2.status,
      },
    }));
  }, [_update]);

  /**
   * Guarda F2 — cambia status a "guardado" y registra savedAt.
   * Acepta un `partial` opcional para mergear datos que vienen del server
   * sin tener que llamar `updateF2` después (lo que regresaría el status a
   * `sin_guardar`).
   */
  const guardarF2 = useCallback((id: string, partial?: Partial<F2Data>) => {
    _update(id, e => ({
      ...e,
      f2: {
        ...e.f2,
        data: partial ? { ...e.f2.data, ...partial } : e.f2.data,
        status: "guardado",
        savedAt: new Date().toISOString(),
      },
      // F3 pasa a sin_guardar porque sus cálculos cambiaron
      f3: { status: "sin_guardar" },
    }));
  }, [_update]);

  // ── F3 ────────────────────────────────────────────────────────────────────

  /** Marca F3 como visto/guardado (es solo lectura, calculado desde F2) */
  const marcarF3Visto = useCallback((id: string) => {
    _update(id, e => ({ ...e, f3: { status: "guardado" } }));
  }, [_update]);

  // ── Expediente activo ─────────────────────────────────────────────────────

  const getActivo = useCallback((): string | null => _loadActivo(), []);
  const setActivo = useCallback((id: string | null) => _persistActivo(id), []);

  return {
    expedientes,
    crear,
    eliminar,
    mergeListaDesdeServidor,
    mergeDetalleEnStore,
    renombrar,
    getExpediente,
    updateF1,
    guardarF1,
    updateF2,
    guardarF2,
    marcarF3Visto,
    getActivo,
    setActivo,
  };
}

// ─── Tipo exportado del store ─────────────────────────────────────────────────

export type ExpedienteStore = ReturnType<typeof useExpedienteStore>;
