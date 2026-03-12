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

# Crear directorio para la base de datos
RUN mkdir -p prisma/prisma

# Generar Prisma client y DB
RUN DATABASE_URL=file:./prisma/dev.db npx prisma generate
RUN DATABASE_URL=file:./prisma/dev.db npx prisma db push

EXPOSE 3001

CMD ["npm", "run", "dev"]
