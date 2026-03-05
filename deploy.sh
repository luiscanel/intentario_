#!/bin/bash

# ============================================
# Script de Despliegue - Inventario Almo
# Servidor Dedicado (Sin Docker)
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
LOG_FILE="/var/log/inventario-almo/install.log"
SERVER_IP=$(hostname -I | awk '{print $1}')

# ============================================
# Funciones de logging
# ============================================
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1" >> $LOG_FILE 2>/dev/null || true
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN] $1" >> $LOG_FILE 2>/dev/null || true
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" >> $LOG_FILE 2>/dev/null || true
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [STEP] $1" >> $LOG_FILE 2>/dev/null || true
}

# Verificar root
if [ "$EUID" -ne 0 ]; then
    log_error "Este script debe ejecutarse como root"
    echo "Uso: sudo $0"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  INSTALADOR - Inventario Almo${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ============================================
# Paso 1: Actualizar sistema
# ============================================
log_step "Actualizando sistema..."
export DEBIAN_FRONTEND=noninteractive
apt update && apt upgrade -y

# Instalar dependencias
apt install -y curl wget git unzip sudo gnupg ca-certificates lsb-release build-essential nginx ufw fail2ban certbot python3-certbot-nginx sshpass

# ============================================
# Paso 2: Instalar Node.js 20.x
# ============================================
log_step "Instalando Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    log_warn "Node.js ya está instalado: $(node --version)"
fi

# ============================================
# Paso 3: Instalar PM2
# ============================================
log_step "Instalando PM2..."
npm install -g pm2
npm config set registry https://registry.npmmirror.com

# ============================================
# Paso 4: Crear directorios
# ============================================
log_step "Creando directorios..."
mkdir -p $APP_DIR
mkdir -p /var/log/inventario-almo
mkdir -p $APP_DIR/backups
mkdir -p /var/log/inventario

# ============================================
# Paso 5: Clonar proyecto
# ============================================
log_step "Clonando proyecto desde GitHub..."

GITHUB_TOKEN="${GITHUB_TOKEN:-}"
REPO_URL="https://github.com/luiscanel/intentario_.git"

if [ -n "$GITHUB_TOKEN" ]; then
    REPO_URL="https://${GITHUB_TOKEN}@github.com/luiscanel/intentario_.git"
fi

if [ -d "$APP_DIR/.git" ]; then
    log_info "Repositorio ya existe, actualizando..."
    cd $APP_DIR
    git pull origin master
else
    rm -rf $APP_DIR
    git clone "$REPO_URL" $APP_DIR
    cd $APP_DIR
fi

# Permisos
chown -R $(whoami):$(whoami) $APP_DIR
chmod -R 755 $APP_DIR

# ============================================
# Paso 6: Instalar dependencias
# ============================================
log_step "Instalando dependencias..."

cd $APP_DIR
npm install

# ============================================
# Paso 7: Configurar variables de entorno
# ============================================
log_step "Configurando variables de entorno..."

JWT_SECRET=$(openssl rand -base64 32)

# Configurar CORS con la IP del servidor
CORS_ORIGIN="http://$SERVER_IP"

cat > $APP_DIR/server/.env << EOF
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h
DATABASE_URL=file:./prisma/dev.db
CORS_ORIGIN=$CORS_ORIGIN
RATE_LIMIT_WINDOW_MS=15 minutes
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
BACKUP_DIR=/opt/inventario-almo/backups
EOF

cat > $APP_DIR/client/.env << EOF
VITE_API_URL=http://localhost:3001
EOF

log_info "CORS configurado: $CORS_ORIGIN"

# ============================================
# Paso 8: Generar Prisma y Base de Datos
# ============================================
log_step "Generando Prisma Client..."
cd $APP_DIR/server
npx prisma generate

log_step "Creando base de datos..."
npx prisma db push

# Verificar base de datos
if [ ! -f "$APP_DIR/server/prisma/dev.db" ]; then
    log_error "No se encontró la base de datos"
    exit 1
fi

log_info "Base de datos lista: $APP_DIR/server/prisma/dev.db"

# ============================================
# Paso 9: Crear usuario admin
# ============================================
log_step "Creando usuario administrador..."

cd $APP_DIR/server
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await prisma.user.upsert({
    where: { email: 'jorge.canel@grupoalmo.com' },
    update: {},
    create: {
      email: 'jorge.canel@grupoalmo.com',
      password: hashedPassword,
      nombre: 'Jorge Canel',
      rol: 'admin',
      activo: true
    }
  });
  
  console.log('Usuario admin listo');
}

main().finally(() => prisma.\$disconnect());
"

# ============================================
# Paso 10: Build Frontend
# ============================================
log_step "Build frontend..."
cd $APP_DIR/client
npm run build

# ============================================
# Paso 11: Configurar Nginx con HTTPS
# ============================================
log_step "Configurando Nginx..."

# Copiar configuración
cp $APP_DIR/nginx.conf /etc/nginx/sites-available/inventario-almo
ln -sf /etc/nginx/sites-available/inventario-almo /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

nginx -t
systemctl restart nginx
systemctl enable nginx

# ============================================
# Paso 12: Configurar PM2
# ============================================
log_step "Configurando PM2..."

cd $APP_DIR
pm2 delete inventario-backend inventario-frontend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# Auto-inicio
pm2 startup

# Permisos
chown -R $(whoami):$(whoami) $APP_DIR

# ============================================
# Paso 13: Configurar Firewall
# ============================================
log_step "Configurando firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ============================================
# Resumen
# ============================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  INSTALACIÓN COMPLETADA${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Frontend: ${BLUE}http://$SERVER_IP${NC}"
echo -e "Backend:  ${BLUE}http://$SERVER_IP:3001${NC}"
echo -e "API:      ${BLUE}http://$SERVER_IP/api/${NC}"
echo ""
echo -e "Credenciales:"
echo -e "  Usuario: jorge.canel@grupoalmo.com"
echo -e "  Contraseña: admin123"
echo ""
echo -e "Comandos:"
echo -e "  pm2 status"
echo -e "  pm2 logs"
echo -e "  pm2 restart all"
echo ""
echo -e "${YELLOW}Para SSL/HTTPS con dominio real:${NC}"
echo -e "  sudo certbot --nginx -d tudominio.com --agree-tos -m tu@email.com"
echo ""
