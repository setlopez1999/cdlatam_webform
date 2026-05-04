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
import { useState, useCallback } from "react";
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
  const [expedientes, setExpedientes] = useState<Expediente[]>(_load);

  // NOTA: _persist() se llama explícitamente en cada mutación (crear, eliminar, _update)
  // No usar useEffect para persistir — causaría sobreescritura con estado inicial vacío

  // ── Helpers internos ──────────────────────────────────────────────────────

  const _update = useCallback((id: string, updater: (exp: Expediente) => Expediente) => {
    setExpedientes(prev => {
      const next = prev.map(e => e.id === id ? updater({ ...e, updatedAt: new Date().toISOString() }) : e);
      _persist(next);  // Persistir en cada mutación
      return next;
    });
  }, []);

  // ── CRUD de expedientes ───────────────────────────────────────────────────

  /** Crea un nuevo expediente y lo devuelve */
  const crear = useCallback((nombre?: string): Expediente => {
    const exp = _crearExpediente(nombre);
    // Persistir ANTES de setExpedientes para que la navegación inmediata lea el dato correcto
    const current = _load();
    const next = [...current, exp];
    _persist(next);
    _persistActivo(exp.id);
    setExpedientes(next);
    return exp;
  }, []);

  /** Elimina un expediente por id (solo cliente; el servidor debe borrarse aparte). */
  const eliminar = useCallback((id: string) => {
    setExpedientes(prev => {
      const next = prev.filter(e => e.id !== id);
      _persist(next);
      return next;
    });
  }, []);

  /** Reemplaza la lista completa (p. ej. tras `expediente.listarResumen`). */
  const reemplazarListaDesdeServidor = useCallback((list: Expediente[]) => {
    setExpedientes(list);
    _persist(list);
  }, []);

  /** Inserta o actualiza un expediente desde `expediente.detalle`. */
  const mergeDetalleEnStore = useCallback((exp: Expediente) => {
    setExpedientes(prev => {
      const idx = prev.findIndex(e => e.id === exp.id);
      const next = idx >= 0 ? prev.map(e => (e.id === exp.id ? exp : e)) : [...prev, exp];
      _persist(next);
      return next;
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
   * Aquí se conectará trpc.actas.create/update en el futuro.
   */
  const guardarF1 = useCallback((id: string) => {
    _update(id, e => ({
      ...e,
      f1: { ...e.f1, status: "guardado", savedAt: new Date().toISOString() },
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
   * Aquí se conectará trpc.evaluaciones.create/update en el futuro.
   */
  const guardarF2 = useCallback((id: string) => {
    _update(id, e => ({
      ...e,
      f2: { ...e.f2, status: "guardado", savedAt: new Date().toISOString() },
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
    reemplazarListaDesdeServidor,
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
