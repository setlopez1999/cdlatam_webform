# fase de construccion
FROM node:20-slim AS builder
WORKDIR /app
# better-sqlite3 necesita Python + build tools para compilar
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build                

# fase de produccion
FROM node:20-slim
WORKDIR /app
# better-sqlite3 necesita Python + build tools para compilar
RUN apt-get update && apt-get install -y python3 make g++ curl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./

# instalamos dependencias
RUN npm install --legacy-peer-deps

# copiamos la carpeta drizzle y el config (IMPORTANTE para que npx drizzle trabaje)
COPY drizzle ./drizzle 
COPY drizzle.config.ts ./

# copiamos los PDFs de clausulas
COPY data ./data

# copiamos la carpeta compilada
COPY --from=builder /app/dist ./dist

# Crear carpeta data y dar permisos al usuario node
RUN mkdir -p /app/data && chown -R node:node /app/data

EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
CMD ["node", "dist/index.js"]