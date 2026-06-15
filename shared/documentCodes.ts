/**
 * Generador centralizado de códigos de documentos (cliente + servidor).
 * Cambiar solo aquí para adoptar nuevos formatos.
 *
 * N° de Acta: <PREFIJO>-<NÚMERO>
 *   - PREFIJO: 2 letras según la Unidad de Negocio del primer servicio contratado
 *   - NÚMERO:  correlativo desde 10001 (autoincremental real en BD)
 *
 * Ejemplos: VS-10001, TX-10002, IN-10003, RD-10004, HO-10005
 *
 * Si no hay Unidad de Negocio seleccionada → prefijo "XX"
 * Si no hay nroActa en BD (expediente nuevo sin guardar) → fallback hash del UUID
 */

// ── Mapa de prefijos por Unidad de Negocio ──────────────────────────────────
// Clave: fragmento del nombre (case-insensitive). Valor: prefijo de 2 letras.
const UNIDAD_PREFIJO_MAP: Array<{ match: string; prefix: string }> = [
  { match: "vas",         prefix: "VS" },
  { match: "tx channel",  prefix: "TX" },
  { match: "tx",          prefix: "TX" },
  { match: "ingeniería",  prefix: "IN" },
  { match: "ingenieria",  prefix: "IN" },
  { match: "respaldo",    prefix: "RD" },
  { match: "hospitality", prefix: "HO" },
];

/**
 * Devuelve el prefijo de 2 letras para una Unidad de Negocio.
 * Si no coincide con ninguna entrada conocida, devuelve "XX".
 */
export function getUnidadNegocioPrefijo(unidadNegocio: string): string {
  const lower = (unidadNegocio ?? "").toLowerCase().trim();
  if (!lower) return "XX";
  for (const entry of UNIDAD_PREFIJO_MAP) {
    if (lower.includes(entry.match)) return entry.prefix;
  }
  return "XX";
}

// ── Helpers internos ─────────────────────────────────────────────────────────

function numericHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function compactFromUuid(uuid: string): string {
  const clean = uuid.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const core = (clean.slice(0, 6) || "EXP").padEnd(6, "X");
  let hash = 2166136261;
  for (let i = 0; i < uuid.length; i++) {
    hash ^= uuid.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const checksum = Math.abs(hash >>> 0).toString(36).toUpperCase().slice(0, 4).padEnd(4, "0");
  return `${core}${checksum}`;
}

export function buildExpedienteCodigo(uuid: string): string {
  return `EXP-${compactFromUuid(uuid)}`;
}

/**
 * Genera el código visual del Acta: <PREFIJO>-<NÚMERO>
 *
 * @param expedienteUuid   UUID del expediente (fallback si no hay nroActa)
 * @param nroActa          Número real de BD (autoincremental desde 10001)
 * @param unidadNegocio    Primera Unidad de Negocio del acta (para el prefijo)
 *
 * Ejemplos:
 *   buildActaCodigo("...", 10001, "VAS Solution (VS)") → "VS-10001"
 *   buildActaCodigo("...", 10002, "TX Channel (TX)")   → "TX-10002"
 *   buildActaCodigo("...", undefined, "")              → "XX-10001" (fallback hash)
 */
export function buildActaCodigo(
  expedienteUuid: string,
  nroActa?: number | null,
  unidadNegocio?: string,
): string {
  const prefix = getUnidadNegocioPrefijo(unidadNegocio ?? "");

  if (nroActa && nroActa > 0) {
    return `${prefix}-${nroActa}`;
  }

  // Fallback: hash determinístico del UUID (expediente nuevo sin guardar aún)
  const h = numericHash(expedienteUuid);
  const num = 10001 + (h % 89999); // rango 10001–99999
  return `${prefix}-${num}`;
}
