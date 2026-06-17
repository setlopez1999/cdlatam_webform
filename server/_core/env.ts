/**
 * env.ts — Configuración y validación de variables de entorno
 *
 * Todas las variables de entorno del servidor se leen desde aquí.
 * Falla en producción si los secrets son débiles o están ausentes.
 */

// Secrets conocidos débiles (nunca usar en producción)
const WEAK_SECRETS = [
  "esto_es_segurisimo_causa",
  "TUERESESPANTACHOROS_ASIESJIJIJAJA",
  "cambia_esto_por_un_secreto_de_32_caracteres_o_mas",
  "cambia_esto_por_otro_secreto_de_32_caracteres_o_mas",
  "GENERA_CON_openssl_rand_hex_32",
];

function validateSecret(value: string, name: string): string {
  if (WEAK_SECRETS.some(w => value.includes(w))) {
    const msg = `${name} es débil o es el valor de ejemplo — generá uno nuevo con: openssl rand -hex 32`;
    if (process.env.NODE_ENV === "production") {
      throw new Error(`[ENV] ❌ ${msg}`);
    }
    console.warn(`[ENV] ⚠️  ${msg}`);
  }
  if (value.length < 32) {
    const msg = `${name} tiene menos de 32 caracteres (tiene ${value.length}) — se recomienda >= 32`;
    if (process.env.NODE_ENV === "production") {
      throw new Error(`[ENV] ❌ ${msg}`);
    }
    console.warn(`[ENV] ⚠️  ${msg}`);
  }
  return value;
}

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`[ENV] ❌ Variable de entorno requerida no configurada: ${name}`);
  return val;
}

console.log(`[ENV] Config loaded — NODE_ENV=${process.env.NODE_ENV ?? "(not set)"}`);

export const ENV = {
  // Clave para firmar JWT de sesión
  cookieSecret: validateSecret(requireEnv("JWT_SECRET"), "JWT_SECRET"),

  // Base de datos
  databaseUrl: process.env.DATABASE_URL ?? "",

  // Entorno
  isProduction: process.env.NODE_ENV === "production",

  // Debug (verbose logging de dataSource)
  appDebug: process.env.APP_DEBUG === "true" || process.env.DEBUG === "true",

  // Fuente de datos externa
  useApi: process.env.USE_API === "true",

  // Contraseñas por defecto de usuarios (opcionales — se generan aleatoriamente si no están)
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD,
  defaultUserPassword: process.env.DEFAULT_USER_PASSWORD,
};
