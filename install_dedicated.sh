#!/bin/bash

# =============================================================================
# Script de Instalación - Inventario Almo (Servidor Dedicado)
# =============================================================================
# Instalación completa con:
# - Node.js 20.x + PM2
# - Nginx configurado correctamente
# - Frontend y Backend funcionando
# =============================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================
# CONFIGURACIÓN - Modificar aquí
# ============================================
APP_USER="inventario"
APP_PASSWORD="123456789"
ROOT_PASSWORD="123456789"
GIT_REPO="https://github.com/luiscanel/Inventario-Almo.git"
APP_DIR="/opt/inventario-almo"

# IP del servidor
SERVER_IP="192.168.0.12"

# Puertos (NO CAMBIAR - coincidencias críticas)
BACKEND_PORT=3001
FRONTEND_PORT=5174  # IMPORTANTE: debe coincidir con ecosystem.config.js y Nginx

# ============================================

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  INSTALACIÓN INVENTARIO ALMO${NC}"
echo -e "${BLUE}  Servidor Dedicado (Producción)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# -----------------------------------------------------------------------------
# Verificar root
# -----------------------------------------------------------------------------
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Este script debe ejecutarse como root${NC}"
    exit 1
fi

echo -e "${YELLOW}[1/14] Verificando sistema...${NC}"
. /etc/os-release
echo -e "${GREEN}Sistema: $PRETTY_NAME${NC}"

# -----------------------------------------------------------------------------
# Actualizar e instalar dependencias
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[2/14] Instalando dependencias del sistema...${NC}"

export DEBIAN_FRONTEND=noninteractive
apt update && apt upgrade -y

apt install -y \
    curl \
    wget \
    git \
    unzip \
    sudo \
    gnupg \
    ca-certificates \
    lsb-release \
    build-essential \
    nginx \
    ufw \
    fail2ban \
    sshpass \
    certbot \
    python3-certbot-nginx

# -----------------------------------------------------------------------------
# Instalar Node.js
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[3/14] Instalando Node.js 20.x...${NC}"

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo -e "${GREEN}Node.js: $(node -v)${NC}"

# -----------------------------------------------------------------------------
# Crear usuario
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[4/14] Creando usuario '$APP_USER'...${NC}"

if ! id "$APP_USER" &>/dev/null; then
    useradd -m -s /bin/bash -G sudo "$APP_USER"
    echo "$APP_USER:$APP_PASSWORD" | chpasswd
    echo -e "${GREEN}Usuario creado${NC}"
fi

# -----------------------------------------------------------------------------
# Contraseña root
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[5/14] Configurando contraseña de root...${NC}"
echo "root:$ROOT_PASSWORD" | chpasswd

# -----------------------------------------------------------------------------
# Clonar proyecto
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[6/14] Clonando proyecto...${NC}"

if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || true
else
    git clone "$GIT_REPO" "$APP_DIR"
    cd "$APP_DIR"
fi

chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# -----------------------------------------------------------------------------
# Instalar dependencias
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[7/14] Instalando dependencias npm...${NC}"

cd "$APP_DIR"
npm install

# -----------------------------------------------------------------------------
# Configurar variables de entorno
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[8/14] Configurando .env...${NC}"

cat > "$APP_DIR/server/.env" << EOF
NODE_ENV=production
PORT=$BACKEND_PORT
HOST=0.0.0.0
JWT_SECRET=inventario-almo-prod-$(date +%s)-$(openssl rand -hex 16)
JWT_EXPIRES_IN=24h
DATABASE_URL=file:./prisma/dev.db
CORS_ORIGIN=http://$SERVER_IP
EOF

chown "$APP_USER:$APP_USER" "$APP_DIR/server/.env"
echo -e "${GREEN}CORS configurado: http://$SERVER_IP${NC}"

# -----------------------------------------------------------------------------
# Prisma y base de datos
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[9/14] Generando base de datos...${NC}"

cd "$APP_DIR/server"
npx prisma generate
npx prisma db push

# -----------------------------------------------------------------------------
# Compilar frontend (importante para producción)
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[10/14] Compilando frontend...${NC}"

cd "$APP_DIR/client"
npm run build
echo -e "${GREEN}Frontend compilado${NC}"

# -----------------------------------------------------------------------------
# PM2
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[11/14] Configurando PM2...${NC}"

npm install -g pm2

# Crear directorio de logs
mkdir -p /var/log/inventario
chown -R "$APP_USER:$APP_USER" /var/log/inventario

# Configuración PM2 - CORREGIDA
# IMPORTANTE: usa paths absolutos y npx con vite
cat > "$APP_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [
    {
      name: 'inventario-backend',
      script: 'npx',
      args: 'tsx src/index.ts',
      cwd: '$APP_DIR/server',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: $BACKEND_PORT,
        HOST: '0.0.0.0'
      },
      error_file: '/var/log/inventario/backend-error.log',
      out_file: '/var/log/inventario/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'inventario-frontend',
      script: 'npx',
      args: 'vite preview --host 0.0.0.0 --port $FRONTEND_PORT',
      cwd: '$APP_DIR/client',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/inventario/frontend-error.log',
      out_file: '/var/log/inventario/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
EOF

chown "$APP_USER:$APP_USER" "$APP_DIR/ecosystem.config.js"

# -----------------------------------------------------------------------------
# Nginx - CORREGIDO para coincidir con puertos
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[12/14] Configurando Nginx...${NC}"

# Configuración Nginx SIMPLE (sin HTTPS redirect para evitar problemas)
cat > /etc/nginx/sites-available/inventario-almo << EOF
server {
    listen 80;
    server_name $SERVER_IP;

    # Frontend (Vite preview server)
    location / {
        proxy_pass http://127.0.0.1:$FRONTEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Uploads
    location /uploads {
        alias $APP_DIR/server/uploads;
        expires 7d;
    }
}
EOF

ln -sf /etc/nginx/sites-available/inventario-almo /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl restart nginx
echo -e "${GREEN}Nginx configurado${NC}"

# -----------------------------------------------------------------------------
# Usuario admin
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[13/14] Creando usuario admin...${NC}"

cd "$APP_DIR/server"
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async main() {
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
  
  console.log('Usuario admin creado');
}

main().finally(() => prisma.\$disconnect());
"

# -----------------------------------------------------------------------------
# Iniciar PM2
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[14/14] Iniciando servicios...${NC}"

cd "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# Detener cualquier proceso anterior
su - "$APP_USER" -c "pm2 delete all 2>/dev/null || true"

# Iniciar servicios
su - "$APP_USER" -c "pm2 start $APP_DIR/ecosystem.config.js"
su - "$APP_USER" -c "pm2 save"

# -----------------------------------------------------------------------------
# Firewall (opcional)
# -----------------------------------------------------------------------------
ufw allow 22/tcp
ufw allow 80/tcp
ufw --force enable 2>/dev/null || true

# -----------------------------------------------------------------------------
# Resumen
# -----------------------------------------------------------------------------
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  INSTALACIÓN COMPLETADA${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Acceso:${NC}"
echo -e "  - URL: http://$SERVER_IP"
echo -e "  - Usuario: jorge.canel@grupoalmo.com"
echo -e "  - Contraseña: admin123"
echo ""
echo -e "${BLUE}Credenciales servidor:${NC}"
echo -e "  - Usuario: $APP_USER / $APP_PASSWORD"
echo -e "  - Root:   $ROOT_PASSWORD"
echo ""
echo -e "${BLUE}Comandos útiles:${NC}"
echo -e "  pm2 status"
echo -e "  pm2 logs"
echo -e "  pm2 restart all"
echo ""
