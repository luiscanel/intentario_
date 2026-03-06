# Client Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY client/package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY client/ ./

EXPOSE 5174

CMD ["npm", "run", "dev", "--", "--host"]
