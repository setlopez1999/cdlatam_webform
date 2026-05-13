/**
 * useHorarioConfig
 * Hook que persiste la configuración de vista del Gestor de Horarios
 * (rango de horas visible) en localStorage.
 */
import { useState, useCallback } from "react";

const LS_KEY = "gestor_horario_config";

export type HorarioConfig = {
  horaInicio: number; // 0–23
  horaFin: number;    // 1–24 (exclusivo)
};

const DEFAULT_CONFIG: HorarioConfig = {
  horaInicio: 0,
  horaFin: 24,
};

function loadConfig(): HorarioConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<HorarioConfig>;
    const horaInicio = typeof parsed.horaInicio === "number" ? parsed.horaInicio : DEFAULT_CONFIG.horaInicio;
    const horaFin = typeof parsed.horaFin === "number" ? parsed.horaFin : DEFAULT_CONFIG.horaFin;
    // Validar rangos
    if (horaInicio < 0 || horaInicio > 23 || horaFin < 1 || horaFin > 24 || horaInicio >= horaFin) {
      return DEFAULT_CONFIG;
    }
    return { horaInicio, horaFin };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function useHorarioConfig() {
  const [config, setConfigState] = useState<HorarioConfig>(loadConfig);

  const setConfig = useCallback((next: HorarioConfig) => {
    setConfigState(next);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {
      // localStorage no disponible (SSR / privado) — ignorar
    }
  }, []);

  return { config, setConfig };
}
