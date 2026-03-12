#!/bin/bash

# ============================================
# Script de instalación - Inventario Almo
# Servidor Ubuntu 24
# ============================================

set -e

echo "=========================================="
echo "  INSTALACIÓN - INVENTARIO ALMO"
echo "=========================================="

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Funciones
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Verificar que es root
if [ "$EUID" -ne 0 ]; then
  log_error "Este script debe ejecutarse como root"
  exit 1
fi

# ============================================
# 1. Actualizar sistema
# ============================================
log_info "Actualizando sistema..."
apt update && apt upgrade -y

# ============================================
# 2. Instalar Node.js 20.x
# ============================================
log_info "Instalando Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    log_warn "Node.js ya está instalado: $(node --version)"
fi

# ============================================
# 3. Instalar SQLite y dependencias
# ============================================
log_info "Instalando dependencias del sistema..."
apt install -y sqlite3 build-essential git curl wget

# ============================================
# 4. Crear directorio del proyecto
# ============================================
PROJECT_DIR="/opt/inventario-almo"
if [ -d "$PROJECT_DIR" ]; then
    log_warn "El directorio $PROJECT_DIR ya existe"
    read -p "¿Deseas continuar y sobrescribir? (s/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        log_info "Instalación cancelada"
        exit 0
    fi
fi

log_info "Creando directorio del proyecto..."
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# ============================================
# 5. Clonar o copiar proyecto
# ============================================
# Si tienes el repositorio en GitHub, descomenta:
# git clone https://github.com/tu-repo/inventario-almo.git .

# Si es copia local, assumption: los archivos ya están en PROJECT_DIR

# ============================================
# 6. Instalar dependencias del servidor
# ============================================
log_info "Instalando dependencias del servidor..."
cd "$PROJECT_DIR/server"
npm install

# ============================================
# 7. Configurar base de datos
# ============================================
log_info "Configurando base de datos..."
cd "$PROJECT_DIR/server"

# Copiar .env.example a .env si no existe
if [ ! -f .env ]; then
    cp .env.example .env
    log_warn "Archivo .env creado. Por favor, configúralo con tus valores"
fi

# Generar Prisma client y crear BD
npx prisma generate
npx prisma db push

# ============================================
# 8. Instalar dependencias del cliente
# ============================================
log_info "Instalando dependencias del cliente..."
cd "$PROJECT_DIR/client"
npm install

# ============================================
# 9. Compilar proyecto
# ============================================
log_info "Compilando servidor..."
cd "$PROJECT_DIR/server"
npm run build

log_info "Compilando cliente..."
cd "$PROJECT_DIR/client"
npm run build

# ============================================
# 10. Configurar PM2
# ============================================
log_info "Configurando PM2..."
cd "$PROJECT_DIR"

# Instalar PM2 si no existe
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Iniciar aplicación con PM2
pm2 start ecosystem.config.js
pm2 save

# Configurar inicio automático
sudo env PATH=$PATH:/usr/local/bin pm2 startup systemd -u root --hp /root 2>/dev/null || \
sudo env PATH=$PATH:/usr/local/bin pm2 startup -u root --hp /root

log_info "PM2 configurado"

# ============================================
# 11. Configurar Nginx (opcional)
# ============================================
read -p "¿Deseas configurar Nginx como proxy reverso? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    log_info "Configurando Nginx..."
    
    apt install -y nginx
    
    # Copiar configuración
    cp nginx.conf /etc/nginx/sites-available/inventario-almo
    ln -sf /etc/nginx/sites-available/inventario-almo /etc/nginx/sites-enabled/
    
    # Verificar y reiniciar
    nginx -t
    systemctl restart nginx
    
    log_info "Nginx configurado"
fi

# ============================================
# 12. Resumen
# ============================================
echo ""
echo "=========================================="
echo "  INSTALACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "Estado de PM2:"
pm2 status
echo ""
echo "Puertos:"
echo "  - Backend: 3001"
echo "  - Frontend: 5173 (desarrollo) o 4173 (producción)"
echo ""
echo "Comandos útiles:"
echo "  pm2 status          - Ver estado"
echo "  pm2 logs            - Ver logs"
echo "  pm2 restart all    - Reiniciar todo"
echo "  pm2 stop all       - Detener todo"
echo ""
log_info "¡Instalación finalizada!"
