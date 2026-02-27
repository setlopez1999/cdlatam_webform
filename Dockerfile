# 1. Fase de construcción
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build                

# 2. Fase de producción
FROM node:20-slim
WORKDIR /app
COPY package*.json ./

# MODIFICACIÓN AQUÍ: Instalamos dependencias, pero incluimos vite
# Ya que tu servidor lo necesita para correr.
RUN npm install --legacy-peer-deps

# Copiamos la carpeta compilada
COPY --from=builder /app/dist ./dist 

EXPOSE 3000
CMD ["node", "dist/index.js"]