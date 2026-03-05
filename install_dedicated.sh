#!/bin/bash

# =============================================================================
# Script de Instalación - Inventario Almo (Servidor Dedicado)
# =============================================================================
# Instalación completa con:
# - Node.js 20.x + PM2
# - Nginx con SSL (Let's Encrypt)
# - Redirect HTTP → HTTPS
# - CORS configurado
# - Frontend en producción
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

# IP o dominio del servidor
SERVER_IP="192.168.0.12"
DOMAIN=""  # Dejar vacío si no tienes dominio, usar IP

# Puertos
BACKEND_PORT=3001
FRONTEND_PORT=5173  # Cambiado para producción build

# Correo para Let's Encrypt
EMAIL="admin@grupoalmo.com"

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

echo -e "${YELLOW}[1/15] Verificando sistema...${NC}"
. /etc/os-release
echo -e "${GREEN}Sistema: $PRETTY_NAME${NC}"

# -----------------------------------------------------------------------------
# Actualizar e instalar dependencias
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[2/15] Instalando dependencias del sistema...${NC}"

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
echo -e "${YELLOW}[3/15] Instalando Node.js 20.x...${NC}"

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo -e "${GREEN}Node.js: $(node -v)${NC}"

# -----------------------------------------------------------------------------
# Crear usuario
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[4/15] Creando usuario '$APP_USER'...${NC}"

if ! id "$APP_USER" &>/dev/null; then
    useradd -m -s /bin/bash -G sudo "$APP_USER"
    echo "$APP_USER:$APP_PASSWORD" | chpasswd
    echo -e "${GREEN}Usuario creado${NC}"
fi

# -----------------------------------------------------------------------------
# Contraseña root
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[5/15] Configurando contraseña de root...${NC}"
echo "root:$ROOT_PASSWORD" | chpasswd

# -----------------------------------------------------------------------------
# Clonar proyecto
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[6/15] Clonando proyecto...${NC}"

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
echo -e "${YELLOW}[7/15] Instalando dependencias npm...${NC}"

cd "$APP_DIR"
npm install

# -----------------------------------------------------------------------------
# Configurar variables de entorno
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[8/15] Configurando .env...${NC}"

# Determinar CORS_ORIGIN
if [ -n "$DOMAIN" ]; then
    CORS_ORIGIN="https://$DOMAIN"
else
    CORS_ORIGIN="http://$SERVER_IP"
fi

cat > "$APP_DIR/server/.env" << EOF
NODE_ENV=production
PORT=$BACKEND_PORT
HOST=0.0.0.0
JWT_SECRET=inventario-almo-prod-$(date +%s)-$(openssl rand -hex 16)
JWT_EXPIRES_IN=24h
DATABASE_URL=file:./prisma/dev.db
CORS_ORIGIN=$CORS_ORIGIN
EOF

chown "$APP_USER:$APP_USER" "$APP_DIR/server/.env"
echo -e "${GREEN}CORS configurado: $CORS_ORIGIN${NC}"

# -----------------------------------------------------------------------------
# Prisma y base de datos
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[9/15] Generando base de datos...${NC}"

cd "$APP_DIR/server"
npx prisma generate
npx prisma db push

# -----------------------------------------------------------------------------
# Compilar TypeScript
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[10/15] Compilando backend...${NC}"

npm run build
echo -e "${GREEN}Backend compilado${NC}"

# -----------------------------------------------------------------------------
# Compilar frontend
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[11/15] Compilando frontend...${NC}"

cd "$APP_DIR/client"

# Configurar Vite para producción
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
EOF

npm run build
echo -e "${GREEN}Frontend compilado${NC}"

# -----------------------------------------------------------------------------
# PM2
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[12/15] Configurando PM2...${NC}"

npm install -g pm2

# Crear directorio de logs
mkdir -p /var/log/inventario
chown -R "$APP_USER:$APP_USER" /var/log/inventario

# Configuración PM2 para producción
cat > "$APP_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [
    {
      name: 'inventario-backend',
      script: 'dist/index.js',
      cwd: './server',
      interpreter: 'none',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: $BACKEND_PORT
      },
      error_file: '/var/log/inventario/backend-error.log',
      out_file: '/var/log/inventario/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'inventario-frontend',
      script: 'npm',
      args: 'run preview',
      cwd: './client',
      interpreter: 'none',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: $FRONTEND_PORT
      },
      error_file: '/var/log/inventario/frontend-error.log',
      out_file: '/var/log/inventario/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
EOF

# -----------------------------------------------------------------------------
# Nginx con HTTP y HTTPS
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[13/15] Configurando Nginx...${NC}"

# Determinar server_name
if [ -n "$DOMAIN" ]; then
    SERVER_NAME="$DOMAIN $SERVER_IP"
else
    SERVER_NAME="$SERVER_IP"
fi

# Configuración Nginx con HTTP, HTTPS y redirect
cat > /etc/nginx/sites-available/inventario-almo << EOF
# HTTP - Redirect to HTTPS
server {
    listen 80;
    server_name $SERVER_NAME;

    # Redirect HTTP → HTTPS
    return 301 https://\$host\$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name $SERVER_NAME;

    # SSL (se configurará con Let's Encrypt o certificados propios)
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Frontend (Producción - carpeta dist)
    location / {
        root $APP_DIR/client/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        # Cache para estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        proxy_pass http://127.0.0.1:$FRONTEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
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

# -----------------------------------------------------------------------------
# Usuario admin
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[14/15] Creando usuario admin...${NC}"

cd "$APP_DIR/server"
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

# -----------------------------------------------------------------------------
# Iniciar PM2
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[15/15] Iniciando servicios...${NC}"

cd "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

su - "$APP_USER" -c "cd $APP_DIR && pm2 start ecosystem.config.js"
pm2 save
pm2 startup

# -----------------------------------------------------------------------------
# Firewall
# -----------------------------------------------------------------------------
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# -----------------------------------------------------------------------------
# Resumen
# -----------------------------------------------------------------------------
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  INSTALACIÓN COMPLETADA${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Acceso:${NC}"
if [ -n "$DOMAIN" ]; then
    echo -e "  - HTTP:  http://$DOMAIN"
    echo -e "  - HTTPS: https://$DOMAIN"
else
    echo -e "  - HTTP:  http://$SERVER_IP"
fi
echo -e "  - Usuario: jorge.canel@grupoalmo.com"
echo -e "  - Contraseña: admin123"
echo ""
echo -e "${BLUE}Credenciales servidor:${NC}"
echo -e "  - Usuario: $APP_USER / $APP_PASSWORD"
echo -e "  - Root:   $ROOT_PASSWORD"
echo ""
echo -e "${BLUE}SSL:${NC}"
echo -e "  Para configurar Let's Encrypt (dominio requerido):"
echo -e "  sudo certbot --nginx -d $DOMAIN --agree-tos -m $EMAIL"
echo ""
echo -e "${BLUE}Comandos:${NC}"
echo -e "  pm2 status"
echo -e "  pm2 logs"
echo -e "  pm2 restart all"
echo ""
