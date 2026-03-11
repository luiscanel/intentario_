#!/bin/bash
# ============================================
# Script para actualizar inventario en producción
# Uso: ./update.sh
# ============================================

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_DIR="/opt/inventario-almo"

echo -e "${YELLOW}=========================================="
echo "Actualizando Inventario Almo"
echo -e "==========================================${NC}"

# ============================================
# Paso 1: Git pull
# ============================================
echo -e "${YELLOW}[1] Obteniendo cambios de GitHub...${NC}"
cd "$BASE_DIR"
git config --global --add safe.directory "$BASE_DIR"
git stash
git pull

# ============================================
# Paso 2: Compilar frontend
# ============================================
echo -e "${YELLOW}[2] Compilando frontend...${NC}"
cd "$BASE_DIR/client"
npm run build

# ============================================
# Paso 3: Compilar backend
# ============================================
echo -e "${YELLOW}[3] Compilando backend...${NC}"
cd "$BASE_DIR/server"
npm run build

# ============================================
# Paso 4: Sincronizar base de datos
# ============================================
echo -e "${YELLOW}[4] Sincronizando base de datos...${NC}"
cd "$BASE_DIR/server"
npx prisma db push
npx tsx scripts/inicializar_sistema.ts

# ============================================
# Paso 5: Reiniciar servicios
# ============================================
echo -e "${YELLOW}[5] Reiniciando servicios...${NC}"

# Detener procesos existentes
pm2 delete inventario-backend 2>/dev/null || true
pm2 delete inventario-frontend 2>/dev/null || true

# Iniciar servicios
cd "$BASE_DIR"
pm2 start ecosystem.config.js

# Guardar configuración para auto-arranque
pm2 save

# Configurar auto-arranque al reiniciar servidor
echo -e "${YELLOW}[6] Configurando auto-arranque al reiniciar...${NC}"

# Detectar el sistema init y configurar
if command -v systemctl &> /dev/null; then
    # systemd (Debian/Ubuntu/CentOS 7+)
    pm2 startup systemd -u root --hp /root 2>/dev/null || true
elif command -v update-rc.d &> /dev/null; then
    # SysV init (Debian/Ubuntu antiguo)
    pm2 startup sysvinit -u root --hp /root 2>/dev/null || true
elif command -v chkconfig &> /dev/null; then
    # SysV init (CentOS antiguo)
    pm2 startup sysvinit -u root --hp /root 2>/dev/null || true
else
    pm2 startup 2>/dev/null || true
fi

echo -e "${GREEN}✅ Servicios configurados para auto-arranque${NC}"

echo -e "${GREEN}=========================================="
echo "✅ Actualización completada"
echo -e "==========================================${NC}"

echo ""
echo "Estado de servicios:"
pm2 status

echo ""
echo "Logs del backend:"
pm2 logs inventario-backend --lines 10 --nostream
