export const ENV = {
  cookieSecret: process.env.JWT_SECRET || "none",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
};
