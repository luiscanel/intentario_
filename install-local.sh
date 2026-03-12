#!/bin/bash

# ============================================
# Script de instalación - Inventario Almo
# Servidor Ubuntu 24 - Instalación limpia
# ============================================

set -e

echo "=========================================="
echo "  INSTALACIÓN - INVENTARIO ALMO"
echo "  Instalación limpia y segura"
echo "=========================================="

# ============================================
# CONFIGURACIÓN AUTOMÁTICA
# ============================================

# Detectar IP automáticamente
SERVER_IP=$(hostname -I | awk '{print $1}')
SERVER_HOSTNAME=$(hostname)

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Funciones
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[PASO $1/$2]${NC} $3"; }

# ============================================
# 0. Verificaciones iniciales
# ============================================
log_step 0 12 "Verificaciones iniciales..."

if [ "$EUID" -ne 0 ]; then
  log_error "Este script debe ejecutarse como root"
  exit 1
fi

if ! grep -q "Ubuntu" /etc/os-release; then
  log_error "Este script está diseñado para Ubuntu"
  exit 1
fi

log_info "Sistema: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
log_info "IP del servidor: $SERVER_IP"
log_info "Hostname: $SERVER_HOSTNAME"

# ============================================
# 1. Actualizar sistema
# ============================================
log_step 1 12 "Actualizando sistema..."
export DEBIAN_FRONTEND=noninteractive
apt update && apt upgrade -y

# ============================================
# 2. Instalar Node.js 20.x
# ============================================
log_step 2 12 "Instalando Node.js 20.x..."
apt install -y curl gnupg
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
log_info "Node.js: $(node --version) | npm: $(npm --version)"

# ============================================
# 3. Instalar dependencias del sistema
# ============================================
log_step 3 12 "Instalando dependencias del sistema..."
apt install -y sqlite3 build-essential git wget curl htop unzip sudo ca-certificates cron logrotate
npm install -g pm2
log_info "PM2: $(pm2 --version)"

# ============================================
# 4. Crear usuario dedicado
# ============================================
log_step 4 12 "Creando usuario dedicado..."
APP_USER="inventario"
APP_GROUP="inventario"
APP_DIR="/opt/inventario-almo"

getent group $APP_GROUP > /dev/null 2>&1 || groupadd $APP_GROUP
id $APP_USER > /dev/null 2>&1 || useradd -m -g $APP_GROUP -s /bin/bash $APP_USER
mkdir -p $APP_DIR
chown -R $APP_USER:$APP_GROUP $APP_DIR
log_info "Usuario '$APP_USER' creado"

# ============================================
# 5. Generar claves seguras
# ============================================
log_step 5 12 "Generando claves seguras..."
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d '\n')
ADMIN_PASSWORD=$(openssl rand -base64 12 | tr -d '\n/+=' | head -c 12)
log_info "Claves generadas"

# ============================================
# 6. Configurar variables de entorno
# ============================================
log_step 6 12 "Configurando variables de entorno..."

read -p "Dominio o IP [${SERVER_IP}]: " DOMAIN
DOMAIN=${DOMAIN:-$SERVER_IP}

read -p "Puerto backend [3001]: " BACKEND_PORT
BACKEND_PORT=${BACKEND_PORT:-3001}

cat > $APP_DIR/server/.env << EOF
NODE_ENV=production
PORT=$BACKEND_PORT
HOST=0.0.0.0
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h
DATABASE_URL=file:./prisma/prod.db
CORS_ORIGIN=http://$DOMAIN
RATE_LIMIT_WINDOW_MS=15 minutes
RATE_LIMIT_MAX_REQUESTS=1000
AUTH_RATE_LIMIT_MAX=10
ENCRYPTION_KEY=$ENCRYPTION_KEY
EOF

chown $APP_USER:$APP_GROUP $APP_DIR/server/.env
chmod 600 $APP_DIR/server/.env
log_info ".env configurado para http://$DOMAIN"

# ============================================
# 7. Copiar archivos del proyecto
# ============================================
log_step 7 12 "Copiando archivos..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/package.json" ]; then
    cp -r $SCRIPT_DIR/server/* $APP_DIR/
    cp -r $SCRIPT_DIR/client/* $APP_DIR/
    cp $SCRIPT_DIR/package*.json $APP_DIR/ 2>/dev/null || true
    cp $SCRIPT_DIR/ecosystem.config.js $APP_DIR/ 2>/dev/null || true
    cp $SCRIPT_DIR/nginx.conf $APP_DIR/ 2>/dev/null || true
else
    log_error "No se encontraron archivos del proyecto"
    exit 1
fi
chown -R $APP_USER:$APP_GROUP $APP_DIR

# ============================================
# 8. Instalar dependencias
# ============================================
log_step 8 12 "Instalando dependencias..."
cd $APP_DIR/server && sudo -u $APP_USER npm install --production
cd $APP_DIR/client && sudo -u $APP_USER npm install

# ============================================
# 9. Compilar proyecto
# ============================================
log_step 9 12 "Compilando..."
cd $APP_DIR/server && sudo -u $APP_USER npm run build
cd $APP_DIR/client && sudo -u $APP_USER npm run build

# ============================================
# 10. Configurar base de datos
# ============================================
log_step 10 12 "Configurando base de datos..."
cd $APP_DIR/server
sudo -u $APP_USER npx prisma generate
sudo -u $APP_USER npx prisma db push

# ============================================
# 11. Crear usuario admin
# ============================================
log_step 11 12 "Creando usuario admin..."

read -p "Email admin [admin@grupoalmo.com]: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@grupoalmo.com}

read -p "Nombre admin [Administrador]: " ADMIN_NAME
ADMIN_NAME=${ADMIN_NAME:-Administrador}

read -p "Contraseña (dejar vacío para auto-generar): " -s ADMIN_PASS
echo ""
[ -z "$ADMIN_PASS" ] && ADMIN_PASS=$ADMIN_PASSWORD && log_warn "Contraseña auto-generada"

# Crear script de admin
cat > $APP_DIR/server/create_admin_temp.js << ADMINEOF
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('$ADMIN_PASS', 12);
  
  await prisma.user.upsert({
    where: { email: '$ADMIN_EMAIL' },
    update: { password: hashedPassword },
    create: {
      email: '$ADMIN_EMAIL',
      password: hashedPassword,
      nombre: '$ADMIN_NAME',
      rol: 'admin',
      activo: true
    }
  });
  
  console.log('Usuario admin creado');
}

main()
  .catch(console.error)
  .finally(() => prisma.\$disconnect());
ADMINEOF

chown $APP_USER:$APP_GROUP $APP_DIR/server/create_admin_temp.js
sudo -u $APP_USER node $APP_DIR/server/create_admin_temp.js
rm $APP_DIR/server/create_admin_temp.js

# ============================================
# 12. Configurar PM2
# ============================================
log_step 12 12 "Configurando PM2..."

cd $APP_DIR
sudo -u $APP_USER pm2 start ecosystem.config.js
sudo -u $APP_USER pm2 save

# Auto-start
sudo env PATH=\$PATH:/usr/local/bin pm2 startup