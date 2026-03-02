// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './drizzle/schema.ts', // AAAAsegúrate que esta ruta apunte a tu archivo de esquema
  out: './drizzle/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'gestion.db',
  },
});