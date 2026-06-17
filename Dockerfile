# ─────────────────────────────────────────────────────────────────────────────
#  SGA CDLatam — Dockerfile
#  Imagen multi-stage: build → producción
#
#  En producción usa PostgreSQL (DATABASE_URL=postgresql://...)
#  En desarrollo local puede usar SQLite (DATABASE_URL=file:./gestion.db)
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# better-sqlite3 necesita Python + build tools para compilar binarios nativos
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
# NODE_ENV=production es necesario para que vite.config.ts use base: "/sga/"
ENV NODE_ENV=production
RUN npm run build

# ── Stage 2: Producción ───────────────────────────────────────────────────
FROM node:20-slim
WORKDIR /app

# Dependencias de runtime (better-sqlite3 + curl para healthcheck)
RUN apt-get update && apt-get install -y python3 make g++ curl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --legacy-peer-deps --omit=dev

# Schema Drizzle (para migraciones en arranque)
COPY drizzle ./drizzle
COPY drizzle.config.ts ./

# PDFs de cláusulas legales (datos estáticos del sistema)
COPY data ./data

# Build compilado
COPY --from=builder /app/dist ./dist

# Carpeta de uploads/cláusulas (volumen en docker-compose)
RUN mkdir -p /app/data/clausulas && chown -R node:node /app/data

EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/sga/api/health 2>/dev/null || \
      node -e "require('http').get('http://localhost:3000/', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/index.js"]
