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
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
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

EXPOSE 3000
CMD ["node", "dist/index.js"]