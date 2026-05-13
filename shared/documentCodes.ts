/**
 * Generador centralizado de codigos de documentos (cliente + servidor).
 * Cambiar solo aqui para adoptar nuevos formatos.
 */

function base36Hash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(36).toUpperCase();
}

function compactFromUuid(uuid: string): string {
  const clean = uuid.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const core = (clean.slice(0, 6) || "EXP").padEnd(6, "X");
  const checksum = base36Hash(uuid).slice(0, 4).padEnd(4, "0");
  return `${core}${checksum}`;
}

export function buildExpedienteCodigo(uuid: string): string {
  return `EXP-${compactFromUuid(uuid)}`;
}

export function buildActaCodigo(expedienteUuid: string): string {
  return `F1-${compactFromUuid(expedienteUuid)}`;
}
