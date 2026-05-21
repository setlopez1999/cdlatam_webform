/**
 * Generador centralizado de codigos de documentos (cliente + servidor).
 * Cambiar solo aqui para adoptar nuevos formatos.
 *
 * N° de Acta: consecutivo numérico de 6 dígitos, partiendo desde 001000.
 * Se genera determinísticamente desde el UUID del expediente usando un hash
 * numérico mapeado al rango [1000, 999999].
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
 * Determinístico desde el UUID del expediente: el mismo UUID siempre produce
 * el mismo número. El rango empieza en 1000 para que siempre sean 6 dígitos.
 */
export function buildActaCodigo(expedienteUuid: string): string {
  const h = numericHash(expedienteUuid);
  // Mapear al rango [1000, 999999] (6 dígitos garantizados)
  const num = 1000 + (h % 999000);
  return String(num).padStart(6, "0");
}
