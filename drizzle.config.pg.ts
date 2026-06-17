// drizzle.config.pg.ts — Configuración para generar migraciones PostgreSQL
// Uso: npx drizzle-kit generate --config=drizzle.config.pg.ts
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './drizzle/schema.pg.ts',
  out: './drizzle/migrations-pg',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://sga_user:password@localhost:5432/sga_db',
  },
});
