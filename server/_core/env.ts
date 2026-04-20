export const ENV = {
  cookieSecret: process.env.JWT_SECRET || "none",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // true  → muestra stack trace completo en errores (desarrollo)
  // false → muestra solo código genérico (producción / usuarios finales)
  appDebug: process.env.APP_DEBUG === "true",
  // true  → usa API externa (API_URL)
  // false → usa SQLite local (default)
  useApi: process.env.USE_API === "true",
};
