const WEAK_SECRETS = [
  "esto_es_segurisimo_causa",
  "TUERESESPANTACHOROS_ASIESJIJIJAJA",
];

function validateSecret(value: string, name: string): string {
  if (WEAK_SECRETS.includes(value)) {
    const msg = `${name} es débil y conocido — generá uno nuevo con: openssl rand -hex 32`;
    if (process.env.NODE_ENV === "production") {
      throw new Error(msg);
    }
    console.warn(`[ENV] ⚠️  ${msg}`);
  }
  if (value.length < 32 && !WEAK_SECRETS.includes(value)) {
    console.warn(`[ENV] ⚠️  ${name} tiene menos de 32 caracteres — se recomienda >= 32`);
  }
  return value;
}

export const ENV = {
  cookieSecret: validateSecret(
    process.env.JWT_SECRET ?? (() => { throw new Error("JWT_SECRET no configurado"); })(),
    "JWT_SECRET"
  ),
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  appDebug: process.env.APP_DEBUG === "true",
  useApi: process.env.USE_API === "true",
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD,
  defaultUserPassword: process.env.DEFAULT_USER_PASSWORD,
};
