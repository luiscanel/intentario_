#!/bin/bash

# =============================================================================
# Script de Instalación - Inventario Almo (Servidor Dedicado)
# =============================================================================
# Este script instala la aplicación en un servidor Ubuntu dedicado
# Sin Docker - Instalación directa con Node.js, PM2 y Nginx
# =============================================================================

set -e

# Colores para salida
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variables de configuración
APP_USER="inventario"
APP_PASSWORD="123456789"
ROOT_PASSWORD="123456789"
GIT_REPO="https://github.com/luiscanel/Inventario-Almo.git"
APP_DIR="/opt/inventario-almo"
DOMAIN_OR_IP="192.168.0.12"
BACKEND_PORT=3001
FRONTEND_PORT=5174

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  INSTALACIÓN INVENTARIO ALMO${NC}"
echo -e "${BLUE}  Servidor Dedicado (Sin Docker)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# -----------------------------------------------------------------------------
# 1. Verificar que se ejecuta como root
# -----------------------------------------------------------------------------
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Este script debe ejecutarse como root${NC}"
    echo "Uso: sudo bash install.sh"
    exit 1
fi

echo -e "${YELLOW}[1/13] Verificando sistema...${NC}"

. /etc/os-release
echo -e "${GREEN}Sistema detectado: $PRETTY_NAME${NC}"

# -----------------------------------------------------------------------------
# 2. Actualizar sistema e instalar dependencias
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[2/13] Actualizando sistema e instalando dependencias...${NC}"

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
    sshpass

# -----------------------------------------------------------------------------
# 3. Instalar Node.js 20.x
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[3/13] Instalando Node.js 20.x...${NC}"

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo -e "${GREEN}Node.js: $(node -v)${NC}"
echo -e "${GREEN}npm: $(npm -v)${NC}"

# -----------------------------------------------------------------------------
# 4. Crear usuario inventario
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[4/13] Creando usuario '$APP_USER'...${NC}"

if id "$APP_USER" &>/dev/null; then
    echo -e "${YELLOW}El usuario $APP_USER ya existe${NC}"
else
    useradd -m -s /bin/bash -G sudo "$APP_USER"
    echo "$APP_USER:$APP_PASSWORD" | chpasswd
    echo -e "${GREEN}Usuario $APP_USER creado correctamente${NC}"
fi

# -----------------------------------------------------------------------------
# 5. Configurar contraseña de root
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[5/13] Configurando contraseña de root...${NC}"
echo "root:$ROOT_PASSWORD" | chpasswd

# -----------------------------------------------------------------------------
# 6. Clonar el proyecto
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[6/13] Clonando el proyecto desde GitHub...${NC}"

if [ -d "$APP_DIR" ]; then
    echo -e "${YELLOW}El directorio ya existe, actualizando...${NC}"
    cd "$APP_DIR"
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || true
else
    git clone "$GIT_REPO" "$APP_DIR"
    cd "$APP_DIR"
fi

chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# -----------------------------------------------------------------------------
# 7. Instalar dependencias del proyecto
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[7/13] Instalando dependencias del proyecto...${NC}"

cd "$APP_DIR"
npm install

# -----------------------------------------------------------------------------
# 8. Configurar variables de entorno
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[8/13] Configurando variables de entorno...${NC}"

cat > "$APP_DIR/server/.env" << EOF
# Server Configuration
NODE_ENV=production
PORT=$BACKEND_PORT
HOST=0.0.0.0

# JWT - Clave segura para producción
JWT_SECRET=inventario-almo-prod-2024-seguro-min32chars
JWT_EXPIRES_IN=24h

# Database
DATABASE_URL=file:./prisma/dev.db

# CORS - Configuración para producción
CORS_ORIGIN=http://$DOMAIN_OR_IP:$FRONTEND_PORT
EOF

chown "$APP_USER:$APP_USER" "$APP_DIR/server/.env"
echo -e "${GREEN}Archivo .env creado${NC}"

# -----------------------------------------------------------------------------
# 9. Generar Prisma Client y crear base de datos
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[9/13] Generando Prisma Client y base de datos...${NC}"

cd "$APP_DIR/server"
npx prisma generate
npx prisma db push

echo -e "${GREEN}Base de datos creada${NC}"

# -----------------------------------------------------------------------------
# 10. Compilar TypeScript
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[10/13] Compilando TypeScript...${NC}"

cd "$APP_DIR/server"
npm run build

echo -e "${GREEN}Compilación completada${NC}"

# -----------------------------------------------------------------------------
# 11. Instalar y configurar PM2
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[11/13] Configurando PM2...${NC}"

npm install -g pm2

# Crear ecosistema para PM2
cat > "$APP_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [
    {
      name: 'inventario-backend',
      script: 'npm',
      args: 'start',
      cwd: './server',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/inventario/backend-error.log',
      out_file: '/var/log/inventario/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'inventario-frontend',
      script: 'npm',
      args: 'run dev',
      cwd: './client',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 5174
      },
      error_file: '/var/log/inventario/frontend-error.log',
      out_file: '/var/log/inventario/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
EOF

# Crear directorio de logs
mkdir -p /var/log/inventario
chown -R "$APP_USER:$APP_USER" /var/log/inventario

# -----------------------------------------------------------------------------
# 12. Configurar Nginx
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[12/13] Configurando Nginx...${NC}"

cat > /etc/nginx/sites-available/inventario-almo << EOF
server {
    listen 80;
    server_name $DOMAIN_OR_IP;

    # Frontend (Vite)
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
systemctl enable nginx

# -----------------------------------------------------------------------------
# 13. Crear usuario admin inicial
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[13/13] Creando usuario admin...${NC}"

node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const user = await prisma.user.upsert({
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
  
  console.log('Usuario admin creado:', user.email);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.\$disconnect());
"

# -----------------------------------------------------------------------------
# Iniciar aplicación con PM2
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Iniciando servicios con PM2...${NC}"

cd "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

su - "$APP_USER" -c "cd $APP_DIR && pm2 start ecosystem.config.js"

pm2 startup
pm2 save

# -----------------------------------------------------------------------------
# Configuración de firewall
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Configurando firewall...${NC}"

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
echo -e "${BLUE}Información de acceso:${NC}"
echo -e "  - Frontend: http://$DOMAIN_OR_IP"
echo -e "  - Backend:  http://$DOMAIN_OR_IP/api"
echo -e "  - Usuario:  jorge.canel@grupoalmo.com"
echo -e "  - Contraseña: admin123"
echo ""
echo -e "${BLUE}Credenciales del servidor:${NC}"
echo -e "  - Usuario Linux: $APP_USER"
echo -e "  - Contraseña:   $APP_PASSWORD"
echo -e "  - Root:        $ROOT_PASSWORD"
echo ""
echo -e "${BLUE}Comandos útiles:${NC}"
echo -e "  - Ver estado:   pm2 status"
echo -e "  - Ver logs:     pm2 logs"
echo -e "  - Reiniciar:    pm2 restart all"
echo -e "  - Parar:        pm2 stop all"
echo ""
