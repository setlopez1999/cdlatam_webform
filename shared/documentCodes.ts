/**
 * Generador centralizado de codigos de documentos (cliente + servidor).
 * Cambiar solo aqui para adoptar nuevos formatos.
 *
 * N° de Acta: consecutivo numérico de 6 dígitos, partiendo desde 001000.
 * Se asigna en BD al crear el expediente (autoincremental real).
 * Fallback: hash determinístico del UUID para expedientes sin nroActa en BD.
 */

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
  // checksum base36 de 4 chars para el código de expediente
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
 * Genera el N° de Acta como un número consecutivo de 6 dígitos (001000–999999).
 * Usa el nroActa real de BD si está disponible; fallback al hash del UUID.
 */
export function buildActaCodigo(expedienteUuid: string, nroActa?: number | null): string {
  if (nroActa && nroActa > 0) {
    return String(nroActa).padStart(6, "0");
  }
  // Fallback: hash determinístico del UUID (para expedientes sin nroActa en BD)
  const h = numericHash(expedienteUuid);
  const num = 1000 + (h % 999000);
  return String(num).padStart(6, "0");
}
