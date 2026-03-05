#!/bin/bash

# ============================================
# Script de Deploy - Inventario Almo
# Uso: sudo ./deploy.sh
# ============================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variables
APP_DIR="/opt/inventario-almo"
SERVER_IP="192.168.0.12"

# Puertos (importante: deben coincidir)
BACKEND_PORT=3001
FRONTEND_PORT=5174

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  DEPLOY - Inventario Almo${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verificar root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: ejecutar con sudo${NC}"
    exit 1
fi

# -----------------------------------------------------------------------------
# 1. Actualizar código
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[1/7] Actualizando código...${NC}"

if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    git pull origin master
else
    echo -e "${RED}Error: No hay repositorio en $APP_DIR${NC}"
    echo "Ejecutar install_dedicated.sh primero"
    exit 1
fi

# -----------------------------------------------------------------------------
# 2. Instalar dependencias
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[2/7] Instalando dependencias...${NC}"

cd "$APP_DIR"
npm install --silent 2>/dev/null || npm install

# -----------------------------------------------------------------------------
# 3. Compilar frontend
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[3/7] Compilando frontend...${NC}"

cd "$APP_DIR/client"
npm run build

# Verificar que dist existe
if [ ! -d "dist" ]; then
    echo -e "${RED}Error: No se generó la carpeta dist${NC}"
    exit 1
fi

echo -e "${GREEN}Frontend compilado OK${NC}"

# -----------------------------------------------------------------------------
# 4. Regenerar Prisma
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[4/7] Regenerando Prisma...${NC}"

cd "$APP_DIR/server"
npx prisma generate

# -----------------------------------------------------------------------------
# 5. Reiniciar servicios PM2
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[5/7] Reiniciando servicios...${NC}"

# Verificar que ecosystem.config.js tiene los puertos correctos
# Si los paths son relativos, convertirlos a absolutos
if ! grep -q "$APP_DIR" "$APP_DIR/ecosystem.config.js"; then
    echo "Actualizando paths en ecosystem.config.js..."
    sed -i "s|cwd: './server'|cwd: '$APP_DIR/server'|g" "$APP_DIR/ecosystem.config.js"
    sed -i "s|cwd: './client'|cwd: '$APP_DIR/client'|g" "$APP_DIR/ecosystem.config.js"
fi

# Reiniciar PM2
cd "$APP_DIR"
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo -e "${GREEN}PM2 iniciado OK${NC}"

# -----------------------------------------------------------------------------
# 6. Verificar servicios
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[6/7] Verificando servicios...${NC}"

sleep 3

# Verificar que los servicios están corriendo
BACKEND_STATUS=$(pm2 jlist | grep -o '"status":"[^"]*"' | grep 'inventario-backend' | head -1)
FRONTEND_STATUS=$(pm2 jlist | grep -o '"status":"[^"]*"' | grep 'inventario-frontend' | head -1)

if echo "$BACKEND_STATUS" | grep -q "online"; then
    echo -e "${GREEN}✓ Backend online${NC}"
else
    echo -e "${RED}✗ Backend offline${NC}"
    pm2 logs inventario-backend --lines 10
fi

if echo "$FRONTEND_STATUS" | grep -q "online"; then
    echo -e "${GREEN}✓ Frontend online${NC}"
else
    echo -e "${RED}✗ Frontend offline${NC}"
    pm2 logs inventario-frontend --lines 10
fi

# -----------------------------------------------------------------------------
# 7. Verificar Nginx
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[7/7] Verificando Nginx...${NC}"

nginx -t && systemctl reload nginx
echo -e "${GREEN}Nginx OK${NC}"

# -----------------------------------------------------------------------------
# Resumen
# -----------------------------------------------------------------------------
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  DEPLOY COMPLETADO${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Acceso: ${BLUE}http://$SERVER_IP${NC}"
echo -e "Usuario: jorge.canel@grupoalmo.com"
echo -e "Password: admin123"
echo ""
echo -e "${YELLOW}Comandos:${NC}"
echo "  pm2 status"
echo "  pm2 logs"
echo ""
