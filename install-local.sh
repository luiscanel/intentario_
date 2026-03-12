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

# Detectar IP automáticamente
SERVER_IP=$(hostname -I | awk '{print $1}')
SERVER_HOSTNAME=$(hostname)

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[PASO $1/$2]${NC} $3"; }

# ============================================
# 0. Verificaciones iniciales
# ============================================
log_step 0 13 "Verificaciones iniciales..."

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
log_step 1 13 "Actualizando sistema..."
export DEBIAN_FRONTEND=noninteractive
apt update && apt upgrade -y

# ============================================
# 2. Instalar Node.js 20.x
# ============================================
log_step 2 13 "Instalando Node.js 20.x..."
apt install -y curl gnupg
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
log_info "Node.js: $(node --version) | npm: $(npm --version)"

# ============================================
# 3. Instalar dependencias del sistema
# ============================================
log_step 3 13 "Instalando dependencias del sistema..."
apt install -y sqlite3 build-essential git wget curl htop unzip sudo ca-certificates cron logrotate
npm install -g pm2
log_info "PM2: $(pm2 --version)"

# ============================================
# 4. Crear usuario dedicado
# ============================================
log_step 4 13 "Creando usuario dedicado..."
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
log_step 5 13 "Generando claves seguras..."
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d '\n')
ADMIN_PASSWORD=$(openssl rand -base64 12 | tr -d '\n/+=' | head -c 12)
log_info "Claves generadas"

# ============================================
# 6. Copiar archivos del proyecto
# ============================================
log_step 6 13 "Copiando archivos..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/package.json" ]; then
    mkdir -p $APP_DIR/server $APP_DIR/client
    cp -r $SCRIPT_DIR/server/* $APP_DIR/server/
    cp -r $SCRIPT_DIR/client/* $APP_DIR/client/
    cp $SCRIPT_DIR/package*.json $APP_DIR/ 2>/dev/null || true
    cp $SCRIPT_DIR/ecosystem.config.js $APP_DIR/ 2>/dev/null || true
    cp $SCRIPT_DIR/nginx.conf $APP_DIR/ 2>/dev/null || true
else
    log_error "No se encontraron archivos del proyecto"
    exit 1
fi
chown -R $APP_USER:$APP_GROUP $APP_DIR
log_info "Archivos copiados"

# ============================================
# 7. Configurar variables de entorno
# ============================================
log_step 7 13 "Configurando variables de entorno..."

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
# 8. Instalar dependencias
# ============================================
log_step 8 13 "Instalando dependencias..."
cd $APP_DIR/server && sudo -u $APP_USER npm install --production
cd $APP_DIR/client && sudo -u $APP_USER npm install

# ============================================
# 9. Compilar proyecto
# ============================================
log_step 9 13 "Compilando..."
cd $APP_DIR/server && sudo -u $APP_USER npm run build
cd $APP_DIR/client && sudo -u $APP_USER npm run build

# ============================================
# 10. Configurar base de datos
# ============================================
log_step 10 13 "Configurando base de datos..."
cd $APP_DIR/server
sudo -u $APP_USER npx prisma generate
sudo -u $APP_USER npx prisma db push

# ============================================
# 11. Crear usuario admin
# ============================================
log_step 11 13 "Creando usuario admin..."

# Usuario admin por defecto
ADMIN_EMAIL="jorge.canel@grupoalmo.com"
ADMIN_NAME="Jorge Canel"
ADMIN_PASS="admin123"
log_info "Usuario admin: $ADMIN_EMAIL"

# Crear script de admin con valores directos
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

# Crear datos iniciales necesarios
log_info "Creando datos iniciales..."

cat > $APP_DIR/server/create_initial_data.js << 'INITEOF'
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Email config por defecto
  await prisma.emailConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      host: 'smtp.gmail.com',
      puerto: 587,
      usuario: 'admin@grupoalmo.com',
      contrasena: 'changeme',
      usandoTls: true,
      emailFrom: 'admin@grupoalmo.com',
      activo: true
    }
  });

  // Configuración de alertas
  const configs = [
    { tipo: 'servidor_caido', diasAntelacion: 0, activo: true },
    { tipo: 'contrato_por_vencer', diasAntelacion: 30, activo: true },
    { tipo: 'licencia_por_vencer', diasAntelacion: 30, activo: true },
    { tipo: 'certificado_por_vencer', diasAntelacion: 30, activo: true }
  ];

  for (const config of configs) {
    await prisma.configuracionAlerta.upsert({
      where: { tipo: config.tipo },
      update: config,
      create: config
    });
  }

  console.log('Datos iniciales creados');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
INITEOF

chown $APP_USER:$APP_GROUP $APP_DIR/server/create_initial_data.js
sudo -u $APP_USER node $APP_DIR/server/create_initial_data.js
rm $APP_DIR/server/create_initial_data.js

# ============================================
# 12. Configurar PM2
# ============================================
log_step 12 13 "Configurando PM2..."

cd $APP_DIR
sudo -u $APP_USER pm2 start ecosystem.config.js
sudo -u $APP_USER pm2 save

# Auto-start PM2
sudo -u $APP_USER pm2 startup

# ============================================
# RESUMEN FINAL
# ============================================
echo ""
echo "=========================================="
echo "  INSTALACIÓN COMPLETADA"
echo "=========================================="
echo ""
echo "URL: http://$DOMAIN"
echo "Usuario: $ADMIN_EMAIL"
echo "Contraseña: $ADMIN_PASS"
echo ""
echo "Comandos útiles:"
echo "  sudo -u inventario pm2 status"
echo "  sudo -u inventario pm2 logs"
echo "  sudo -u inventario pm2 restart all"
echo ""
log_info "¡Instalación exitosa!"