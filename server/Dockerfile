# Server Dockerfile
FROM node:20-alpine

WORKDIR /app

# Instalar dependencias del sistema
RUN apk add --no-cache openssl

# Copiar package files
COPY server/package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY server/ ./

# Generar Prisma client y DB
RUN npx prisma generate
RUN npx prisma db push

EXPOSE 3001

CMD ["npm", "run", "dev"]
