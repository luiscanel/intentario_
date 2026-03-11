#!/bin/bash

# Script de instalación - Inventario Almo
# Ejecutar en el servidor como: sudo ./deploy.sh

set -e

# Configuración
PROJECT_DIR="/opt/inventario-almo"
GIT_REPO_URL="https://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@github.com/luiscanel/intentario_.git"

echo "=========================================="
echo "  INSTALACIÓN - INVENTARIO ALMO"
echo "=========================================="

# Detectar IP
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "IP detectada: $SERVER_IP"

# Instalar Node.js si no existe
if ! command -v node &> /dev/null; then
    echo "[0/8] Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Instalar PM2
echo "[1/8] Instalando PM2..."
npm install -g pm2

# Clonar repositorio
echo "[2/8] Clonando repositorio..."
rm -rf $PROJECT_DIR
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR
git clone "$GIT_REPO_URL" .
rm -rf node_modules client/node_modules server/node_modules

# Configurar .env
echo "[3/8] Configurando servidor..."
echo -e "CORS_ORIGIN=http://$SERVER_IP\nDATABASE_URL=file:./prisma/dev.db\nJWT_SECRET=inventario_almo_2026_seguro_32chars" > server/.env

echo "[4/8] Configurando cliente..."
echo "VITE_API_URL=http://$SERVER_IP:3001" > client/.env

# Instalar dependencias
echo "[5/8] Instalando dependencias del servidor..."
cd $PROJECT_DIR/server && npm install

# Crear base de datos
echo "[6/8] Creando base de datos..."
cd $PROJECT_DIR/server && npx prisma migrate dev --name init

# Crear admin
echo "[7/8] Creando usuario administrador..."
cd $PROJECT_DIR/server && node create_admin.js

# Compilar frontend
echo "[8/8] Compilando frontend..."
cd $PROJECT_DIR/client && npm install && npm run build

# Iniciar servicios
echo "Iniciando servicios con PM2..."
cd $PROJECT_DIR && pm2 start ecosystem.config.js && pm2 save

echo ""
echo "=========================================="
echo "  INSTALACIÓN COMPLETA"
echo "=========================================="
echo "Frontend: http://$SERVER_IP"
echo "Backend:  http://$SERVER_IP:3001"
echo ""
echo "Credenciales:"
echo "  Usuario: jorge.canel@grupoalmo.com"
echo "  Contraseña: admin123"
echo ""
echo "Verificar: pm2 status"
echo "=========================================="