/**
 * formulariosService.ts — Servicio de formularios (Actas y EPs) via API REST
 *
 * Endpoints consumidos:
 *
 * ACTAS:
 *   GET    /formularios/actas                    → lista de actas del usuario
 *   GET    /formularios/actas/:id                → detalle de un acta
 *   POST   /formularios/actas                    → crear nueva acta
 *   PUT    /formularios/actas/:id                → actualizar acta existente
 *   DELETE /formularios/actas/:id                → eliminar acta
 *
 * EVALUACIONES DE PROYECTO (EP):
 *   GET    /formularios/eps                      → lista de EPs del usuario
 *   GET    /formularios/eps/:id                  → detalle de un EP
 *   POST   /formularios/eps                      → crear nuevo EP
 *   PUT    /formularios/eps/:id                  → actualizar EP existente
 *   DELETE /formularios/eps/:id                  → eliminar EP
 *
 * HISTORIAL:
 *   GET    /formularios/historial                → historial combinado (actas + eps)
 *   GET    /formularios/historial?tipo=acta      → solo actas
 *   GET    /formularios/historial?tipo=ep        → solo EPs
 *
 * Si la API no está configurada, usa localStorage como fallback.
 *
 * TODO: Conectar con API de Base de Datos aquí — reemplazar el bloque
 *       de localStorage por las llamadas reales cuando el backend esté listo.
 */

import { api, isApiConfigured } from "./apiService";

// ── Tipos ─────────────────────────────────────────────────────────────────────
export type FormStatus = "borrador" | "completado" | "exportado";

export interface ActaData {
  id?: string;
  noActa?: string;
  fecha?: string;
  atencion?: string;
  razonSocial?: string;
  nombreFantasia?: string;
  rucDniRut?: string;
  tipoDocumento?: string;
  direccion?: string;
  representanteLegal?: string;
  contactoTecnico?: string;
  contactoFacturacion?: string;
  servicios?: ActaServicio[];
  formasPago?: FormaPago[];
  status?: FormStatus;
  creadoEn?: string;
  actualizadoEn?: string;
}

export interface ActaServicio {
  item?: number;
  unidadNegocio?: string;
  solucion?: string;
  detalleServicio?: string;
  tipoVenta?: string;
  valorUnitario?: number;
  cantidad?: number;
  total?: number;
  plazo?: string;
}

export interface FormaPago {
  tipo: "implementacion" | "mantencion";
  cuotas?: number;
  monto?: number;
  fechaVencimiento?: string;
}

export interface EPData {
  id?: string;
  noEP?: string;
  unidadNegocio?: string;
  nombreCliente?: string;
  solucion?: string;
  tipoMoneda?: string;
  montoProyecto?: number;
  plazo?: string;
  pais?: string;
  fechaEvaluacion?: string;
  hardware?: EPLineItem[];
  materiales?: EPLineItem[];
  rrhh?: EPRrhhItem[];
  otrosGastos?: EPOtrosItem[];
  status?: FormStatus;
  creadoEn?: string;
  actualizadoEn?: string;
}

export interface EPLineItem {
  ceco?: string;
  descripcion?: string;
  valorNeto?: number;
  cantidad?: number;
  totalNeto?: number;
  iva?: number;
  total?: number;
}

export interface EPRrhhItem {
  tipo: "tecnico" | "especialista" | "supervisor";
  nombre?: string;
  horasDia?: number;
  diasMes?: number;
  valorHora?: number;
  totalMes?: number;
}

export interface EPOtrosItem {
  tipo: "comision" | "movilizacion" | "viatico" | "alojamiento" | "varios";
  descripcion?: string;
  valor?: number;
}

export interface HistorialItem {
  id: string;
  tipo: "acta" | "ep";
  titulo: string;
  fecha: string;
  status: FormStatus;
  cliente?: string;
}

// ── localStorage helpers ──────────────────────────────────────────────────────
const LS_ACTAS = "cdlatam_actas";
const LS_EPS = "cdlatam_eps";

function lsGet<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function lsSave<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

function generateId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Servicio ──────────────────────────────────────────────────────────────────
export const formulariosService = {
  // ── ACTAS ──────────────────────────────────────────────────────────────────

  /** Lista todas las actas del usuario autenticado */
  async listActas(): Promise<ActaData[]> {
    // TODO: Conectar con API de Base de Datos aquí
    if (isApiConfigured()) {
      return api.get<ActaData[]>("/formularios/actas");
    }
    return lsGet<ActaData>(LS_ACTAS);
  },

  /** Obtiene el detalle de un acta por ID */
  async getActa(id: string): Promise<ActaData | null> {
    // TODO: Conectar con API de Base de Datos aquí
    if (isApiConfigured()) {
      return api.get<ActaData>(`/formularios/actas/${id}`);
    }
    const actas = lsGet<ActaData>(LS_ACTAS);
    return actas.find((a) => a.id === id) ?? null;
  },

  /** Crea o actualiza un acta (upsert) */
  async saveActa(data: ActaData): Promise<ActaData> {
    // TODO: Conectar con API de Base de Datos aquí
    if (isApiConfigured()) {
      if (data.id) {
        return api.put<ActaData>(`/formularios/actas/${data.id}`, data);
      }
      return api.post<ActaData>("/formularios/actas", data);
    }

    // Fallback localStorage
    const actas = lsGet<ActaData>(LS_ACTAS);
    const now = new Date().toISOString();
    if (data.id) {
      const idx = actas.findIndex((a) => a.id === data.id);
      if (idx >= 0) {
        actas[idx] = { ...data, actualizadoEn: now };
        lsSave(LS_ACTAS, actas);
        return actas[idx]!;
      }
    }
    const newActa: ActaData = { ...data, id: generateId(), creadoEn: now, actualizadoEn: now };
    actas.push(newActa);
    lsSave(LS_ACTAS, actas);
    return newActa;
  },

  /** Elimina un acta por ID */
  async deleteActa(id: string): Promise<void> {
    // TODO: Conectar con API de Base de Datos aquí
    if (isApiConfigured()) {
      return api.delete(`/formularios/actas/${id}`);
    }
    const actas = lsGet<ActaData>(LS_ACTAS).filter((a) => a.id !== id);
    lsSave(LS_ACTAS, actas);
  },

  // ── EVALUACIONES DE PROYECTO (EP) ──────────────────────────────────────────

  /** Lista todos los EPs del usuario autenticado */
  async listEPs(): Promise<EPData[]> {
    // TODO: Conectar con API de Base de Datos aquí
    if (isApiConfigured()) {
      return api.get<EPData[]>("/formularios/eps");
    }
    return lsGet<EPData>(LS_EPS);
  },

  /** Obtiene el detalle de un EP por ID */
  async getEP(id: string): Promise<EPData | null> {
    // TODO: Conectar con API de Base de Datos aquí
    if (isApiConfigured()) {
      return api.get<EPData>(`/formularios/eps/${id}`);
    }
    const eps = lsGet<EPData>(LS_EPS);
    return eps.find((e) => e.id === id) ?? null;
  },

  /** Crea o actualiza un EP (upsert) */
  async saveEP(data: EPData): Promise<EPData> {
    // TODO: Conectar con API de Base de Datos aquí
    if (isApiConfigured()) {
      if (data.id) {
        return api.put<EPData>(`/formularios/eps/${data.id}`, data);
      }
      return api.post<EPData>("/formularios/eps", data);
    }

    // Fallback localStorage
    const eps = lsGet<EPData>(LS_EPS);
    const now = new Date().toISOString();
    if (data.id) {
      const idx = eps.findIndex((e) => e.id === data.id);
      if (idx >= 0) {
        eps[idx] = { ...data, actualizadoEn: now };
        lsSave(LS_EPS, eps);
        return eps[idx]!;
      }
    }
    const newEP: EPData = { ...data, id: generateId(), creadoEn: now, actualizadoEn: now };
    eps.push(newEP);
    lsSave(LS_EPS, eps);
    return newEP;
  },

  /** Elimina un EP por ID */
  async deleteEP(id: string): Promise<void> {
    // TODO: Conectar con API de Base de Datos aquí
    if (isApiConfigured()) {
      return api.delete(`/formularios/eps/${id}`);
    }
    const eps = lsGet<EPData>(LS_EPS).filter((e) => e.id !== id);
    lsSave(LS_EPS, eps);
  },

  // ── HISTORIAL ──────────────────────────────────────────────────────────────

  /** Historial combinado de actas y EPs */
  async getHistorial(tipo?: "acta" | "ep"): Promise<HistorialItem[]> {
    // TODO: Conectar con API de Base de Datos aquí
    if (isApiConfigured()) {
      return api.get<HistorialItem[]>("/formularios/historial", tipo ? { tipo } : undefined);
    }

    // Fallback localStorage
    const items: HistorialItem[] = [];
    if (!tipo || tipo === "acta") {
      const actas = lsGet<ActaData>(LS_ACTAS);
      actas.forEach((a) => {
        items.push({
          id: a.id ?? "",
          tipo: "acta",
          titulo: a.noActa ? `Acta ${a.noActa}` : "Acta sin número",
          fecha: a.creadoEn ?? "",
          status: a.status ?? "borrador",
          cliente: a.razonSocial,
        });
      });
    }
    if (!tipo || tipo === "ep") {
      const eps = lsGet<EPData>(LS_EPS);
      eps.forEach((e) => {
        items.push({
          id: e.id ?? "",
          tipo: "ep",
          titulo: e.noEP ? `EP ${e.noEP}` : "EP sin número",
          fecha: e.creadoEn ?? "",
          status: e.status ?? "borrador",
          cliente: e.nombreCliente,
        });
      });
    }
    return items.sort((a, b) => (b.fecha > a.fecha ? 1 : -1));
  },
};
