# fase de construccion
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build                

# fase de produccion
FROM node:20-slim
WORKDIR /app
COPY package*.json ./

# instalamos dependencias
RUN npm install --legacy-peer-deps

# copiamos la carpeta drizzle con las migraciones
COPY drizzle ./drizzle 

# copiamos la carpeta compilada
COPY --from=builder /app/dist ./dist 

EXPOSE 3000
CMD ["node", "dist/index.js"]