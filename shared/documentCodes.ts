/**
 * Generador centralizado de codigos de documentos (cliente + servidor).
 * Cambiar solo aqui para adoptar nuevos formatos.
 *
 * N° de Acta: <PREFIJO>-<NUMERO>
 *   - PREFIJO: 2 letras derivadas de la Unidad de Negocio del primer servicio del acta.
 *   - NUMERO:  nroActa real de BD (autoincremental, inicia en 10001 para BDs nuevas).
 *   - Ejemplo: VS-10001, TX-10002, IN-10003
 *
 * Mapa de prefijos (modificar aquí si cambian los nombres de las unidades):
 *   VAS Solution     → VS
 *   TX Channel       → TX
 *   Ingeniería       → IN
 *   Respaldo Data    → RD
 *   Hospitality      → HO
 *   (cualquier otra) → EX  (genérico)
 */

// ── Mapa de prefijos por unidad de negocio ────────────────────────────────────
// Cada entrada es [fragmento_del_nombre_en_minúsculas, prefijo].
// Se evalúa en orden: la primera coincidencia gana.
const UNIDAD_PREFIJO_MAP: [string, string][] = [
  ["vas",         "VS"],
  ["tx channel",  "TX"],
  ["tx",          "TX"],
  ["ingeniería",  "IN"],
  ["ingenieria",  "IN"],
  ["respaldo",    "RD"],
  ["hospitality", "HO"],
];

/**
 * Devuelve el prefijo de 2 letras para una unidad de negocio.
 * Si no coincide con ninguna entrada del mapa, devuelve "EX".
 */
export function getUnidadPrefijo(unidadNegocio: string): string {
  const lower = (unidadNegocio ?? "").toLowerCase();
  for (const [fragment, prefix] of UNIDAD_PREFIJO_MAP) {
    if (lower.includes(fragment)) return prefix;
  }
  return "EX";
}

// ── Helpers internos ──────────────────────────────────────────────────────────
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
 * Genera el N° de Acta con formato <PREFIJO>-<NUMERO>.
 *
 * @param expedienteUuid  UUID del expediente (usado como fallback si no hay nroActa).
 * @param nroActa         Número correlativo real de BD (autoincremental desde 10001).
 * @param unidadNegocio   Nombre de la unidad de negocio del primer servicio del acta.
 *                        Si se omite, el prefijo será "EX".
 *
 * Ejemplos:
 *   buildActaCodigo("...", 10001, "VAS Solution (VS)") → "VS-10001"
 *   buildActaCodigo("...", 10002, "TX Channel (TX)")   → "TX-10002"
 *   buildActaCodigo("...", null,  "VAS Solution (VS)") → "VS-XXXXXX" (fallback hash)
 */
export function buildActaCodigo(
  expedienteUuid: string,
  nroActa?: number | null,
  unidadNegocio?: string,
): string {
  const prefijo = getUnidadPrefijo(unidadNegocio ?? "");
  if (nroActa && nroActa > 0) {
    return `${prefijo}-${nroActa}`;
  }
  // Fallback: hash determinístico del UUID (expedientes sin nroActa en BD)
  const h = numericHash(expedienteUuid);
  const num = 10000 + (h % 90000);
  return `${prefijo}-${num}`;
}
