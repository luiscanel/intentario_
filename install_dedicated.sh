#!/bin/bash

# =============================================================================
# Script de Instalación - Inventario Almo (Servidor Dedicado)
# =============================================================================
# Instalación completa con:
# - Node.js 20.x + PM2
# - Nginx con HTTPS (certificado autofirmado)
# - Frontend y Backend funcionando
# - Detección automática de IP
# =============================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================
# CONFIGURACIÓN - Modificar solo si es necesario
# ============================================
APP_USER="inventario"
APP_PASSWORD="123456789"
ROOT_PASSWORD="123456789"
GIT_REPO="https://github.com/luiscanel/intentario_.git"
APP_DIR="/opt/inventario-almo"

# Puertos (NO CAMBIAR)
BACKEND_PORT=3001
FRONTEND_PORT=5174

# Detectar IP automáticamente
detect_ip() {
    local ip
    # Intentar múltiples métodos para detectar la IP
    ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    if [ -z "$ip" ]; then
        ip=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K[^ ]+' )
    fi
    if [ -z "$ip" ]; then
        ip=$(curl -s ifconfig.me 2>/dev/null || echo "127.0.0.1")
    fi
    echo "$ip"
}

SERVER_IP=$(detect_ip)

# ============================================

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  INSTALACIÓN INVENTARIO ALMO${NC}"
echo -e "${BLUE}  Servidor Dedicado (Producción)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}IP detectada: ${GREEN}$SERVER_IP${NC}"

# -----------------------------------------------------------------------------
# Verificar instalación previa
# -----------------------------------------------------------------------------
if [ -d "$APP_DIR" ] && [ -f "$APP_DIR/server/.env" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Instalación previa detectada en $APP_DIR${NC}"
    echo -e "${YELLOW}⚠️  Esto puede sobrescribir configuración y dependencias${NC}"
    echo ""
    read -p "¿Continuar de todos modos? (s/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "Instalación cancelada."
        exit 0
    fi
fi

# -----------------------------------------------------------------------------
# Verificar root
# -----------------------------------------------------------------------------
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Este script debe ejecutarse como root${NC}"
    exit 1
fi

echo -e "${YELLOW}[1/16] Verificando sistema...${NC}"
. /etc/os-release
echo -e "${GREEN}Sistema: $PRETTY_NAME${NC}"

# -----------------------------------------------------------------------------
# Actualizar e instalar dependencias
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[2/16] Instalando dependencias del sistema...${NC}"

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
    python3 \
    python3-pip \
    nginx \
    ufw \
    fail2ban \
    sshpass \
    certbot \
    python3-certbot-nginx \
    openssl

# -----------------------------------------------------------------------------
# Instalar Node.js
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[3/16] Instalando Node.js 20.x...${NC}"

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo -e "${GREEN}Node.js: $(node -v)${NC}"

# -----------------------------------------------------------------------------
# Crear usuario
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[4/16] Creando usuario '$APP_USER'...${NC}"

if ! id "$APP_USER" &>/dev/null; then
    useradd -m -s /bin/bash -G sudo "$APP_USER"
    echo "$APP_USER:$APP_PASSWORD" | chpasswd
    echo -e "${GREEN}Usuario creado${NC}"
fi

# Crear directorio home si no existe
mkdir -p /home/$APP_USER
chown -R $APP_USER:$APP_USER /home/$APP_USER

# -----------------------------------------------------------------------------
# Contraseña root
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[5/16] Configurando contraseña de root...${NC}"
echo "root:$ROOT_PASSWORD" | chpasswd

# -----------------------------------------------------------------------------
# Clonar proyecto
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[6/16] Clonando proyecto...${NC}"

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
echo -e "${YELLOW}[7/16] Instalando dependencias npm...${NC}"

cd "$APP_DIR"

# Instalar como root primero para compilar módulos nativos
npm install --unsafe-perm

# Recompilar módulos nativos como el usuario inventario
chown -R "$APP_USER:$APP_USER" "$APP_DIR/node_modules"
chown -R "$APP_USER:$APP_USER" "$APP_DIR/server/node_modules" 2>/dev/null || true
chown -R "$APP_USER:$APP_USER" "$APP_DIR/client/node_modules" 2>/dev/null || true

# -----------------------------------------------------------------------------
# Configurar variables de entorno (con HTTPS y ruta ABSOLUTA)
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[8/16] Configurando .env...${NC}"

cat > "$APP_DIR/server/.env" << EOF
NODE_ENV=production
PORT=$BACKEND_PORT
HOST=0.0.0.0
JWT_SECRET=inventario-almo-prod-$(date +%s)-$(openssl rand -hex 16)
JWT_EXPIRES_IN=24h
DATABASE_URL=file:$APP_DIR/server/prisma/prisma/dev.db
CORS_ORIGIN=https://$SERVER_IP
EOF

chown "$APP_USER:$APP_USER" "$APP_DIR/server/.env"
chmod 600 "$APP_DIR/server/.env"
echo -e "${GREEN}CORS configurado: https://$SERVER_IP${NC}"
echo -e "${GREEN}DB configurada: $APP_DIR/server/prisma/prisma/dev.db${NC}"

# -----------------------------------------------------------------------------
# Prisma y base de datos
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[9/16] Generando base de datos...${NC}"

cd "$APP_DIR/server"
npx prisma generate
npx prisma db push

# Asegurar permisos de la base de datos
chmod 666 "$APP_DIR/server/prisma/prisma/dev.db" 2>/dev/null || true

# -----------------------------------------------------------------------------
# Compilar frontend (importante para producción)
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[10/16] Compilando frontend...${NC}"

cd "$APP_DIR/client"
npm run build
echo -e "${GREEN}Frontend compilado${NC}"

# -----------------------------------------------------------------------------
# PM2
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[11/16] Configurando PM2...${NC}"

npm install -g pm2

# Crear directorio de logs
mkdir -p /var/log/inventario
chown -R "$APP_USER:$APP_USER" /var/log/inventario

# Configuración PM2
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

# Iniciar PM2 directamente (no con su -)
echo -e "${YELLOW}[12/16] Iniciando PM2...${NC}"
cd "$APP_DIR"
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# -----------------------------------------------------------------------------
# Generar certificados SSL autofirmados
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[13/16] Generando certificados SSL...${NC}"

# Crear directorios si no existen
mkdir -p /etc/ssl/certs /etc/ssl/private

# Generar certificado autofirmado
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/ssl-cert-snakeoil.key \
    -out /etc/ssl/certs/ssl-cert-snakeoil.pem \
    -subj "/C=ES/ST=Madrid/L=Madrid/O=Inventario/CN=$SERVER_IP" \
    2>/dev/null

chmod 600 /etc/ssl/private/ssl-cert-snakeoil.key
chmod 644 /etc/ssl/certs/ssl-cert-snakeoil.pem

echo -e "${GREEN}Certificados SSL generados${NC}"

# -----------------------------------------------------------------------------
# Nginx con HTTPS y redirect HTTP→HTTPS
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[14/16] Configurando Nginx...${NC}"

# Crear directorio sites-available
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

# Configuración Nginx COMPLETA con HTTPS y redirect
cat > /etc/nginx/sites-available/inventario-almo << EOF
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name $SERVER_IP;
    return 301 https://\$host\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $SERVER_IP;

    # SSL certificates (autofirmado)
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

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

ln -sf /etc/nginx/sites-available/inventario-almo /etc/nginx/sites-enabled/inventario-almo
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl restart nginx

echo -e "${GREEN}Nginx configurado con HTTPS${NC}"

# Copiar configuración al home del usuario para referencia
cp /etc/nginx/sites-available/inventario-almo /home/$APP_USER/nginx.conf
chown $APP_USER:$APP_USER /home/$APP_USER/nginx.conf

# -----------------------------------------------------------------------------
# Usuario admin
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[15/16] Creando usuario admin...${NC}"

# Crear script temporal para admin
cat > "$APP_DIR/server/create_admin.js" << 'ADMINEOF'
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
  
  console.log('Usuario admin creado correctamente');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
ADMINEOF

chown "$APP_USER:$APP_USER" "$APP_DIR/server/create_admin.js"
cd "$APP_DIR/server"
node create_admin.js
rm -f "$APP_DIR/server/create_admin.js"

# -----------------------------------------------------------------------------
# Configurar PM2 para inicio automático
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[16/16] Configurando PM2 startup...${NC}"

# Generar comando de startup
PM2_STARTUP=$(pm2 startup 2>/dev/null | grep -oP 'sudo env.*pm2' || true)
if [ -n "$PM2_STARTUP" ]; then
    echo "$PM2_STARTUP" > /home/$APP_USER/pm2-startup.sh
    chmod +x /home/$APP_USER/pm2-startup.sh
    echo -e "${YELLOW}Comando de startup guardado en /home/$APP_USER/pm2-startup.sh${NC}"
fi

pm2 save

# -----------------------------------------------------------------------------
# Firewall (opcional)
# -----------------------------------------------------------------------------
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
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
echo -e "  - URL: https://$SERVER_IP"
echo -e "  - (HTTP redirecciona automáticamente a HTTPS)"
echo -e "  - Usuario: jorge.canel@grupoalmo.com"
echo -e "  - Contraseña: admin123"
echo ""
echo -e "${BLUE}Credenciales servidor:${NC}"
echo -e "  - Usuario: $APP_USER / $APP_PASSWORD"
echo -e "  - Root:   $ROOT_PASSWORD"
echo ""
echo -e "${BLUE}Comandos útiles:${NC}"
echo -e "  sudo su - inventario -c 'pm2 status'"
echo -e "  sudo su - inventario -c 'pm2 logs'"
echo -e "  sudo su - inventario -c 'pm2 restart all'"
echo ""
echo -e "${YELLOW}Nota: El certificado SSL es autofirmado.${NC}"
echo -e "${YELLOW}      El navegador mostrará una advertencia de seguridad.${NC}"
echo -e "${YELLOW}      Para un certificado real, usa certbot o instala certificados propios.${NC}"
echo ""
