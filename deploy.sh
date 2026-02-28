#!/bin/bash

# ============================================
# Script de Despliegue - Inventario Almo
# Servidor Dedicado (Sin Docker)
# ============================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
APP_DIR="/opt/inventario-almo"
LOG_FILE="/var/log/inventario-almo/install.log"

# Funciones de logging
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

# Verificar que se ejecuta como root
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
apt update && apt upgrade -y

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
# Paso 3: Instalar Nginx
# ============================================
log_step "Instalando Nginx..."
apt install -y nginx

# ============================================
# Paso 4: Instalar PM2
# ============================================
log_step "Instalando PM2..."
npm install -g pm2

# Configurar npm para usar mirror si hay problemas de red
npm config set registry https://registry.npmmirror.com

# ============================================
# Paso 5: Crear directorio de la aplicación
# ============================================
log_step "Creando directorio de la aplicación..."
mkdir -p $APP_DIR
mkdir -p /var/log/inventario-almo
mkdir -p $APP_DIR/backups
mkdir -p /var/log/inventario-almo

# ============================================
# Paso 6: Clonar proyecto desde GitHub
# ============================================
log_step "Clonando proyecto desde GitHub..."

# URL del repositorio - usar token si está definido
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
REPO_URL="https://github.com/luiscanel/Host_Dedicado.git"

if [ -n "$GITHUB_TOKEN" ]; then
    # Usar token para autenticación
    REPO_URL="https://${GITHUB_TOKEN}@github.com/luiscanel/Host_Dedicado.git"
    log_info "Usando token de GitHub para clonar"
fi

# Si el directorio ya existe, hacer pull, si no, clonar
if [ -d "$APP_DIR/.git" ]; then
    log_info "Repositorio ya existe, actualizando..."
    cd $APP_DIR
    git pull origin master
else
    # Eliminar directorio si existe sin .git
    rm -rf $APP_DIR
    git clone "$REPO_URL" $APP_DIR
    cd $APP_DIR
fi

# ============================================
# Paso 7: Configurar permisos
# ============================================
log_step "Configurando permisos..."
chown -R $(whoami):$(whoami) $APP_DIR
chmod -R 755 $APP_DIR

# ============================================
# Paso 8: Configurar variables de entorno
# ============================================
log_step "Configurando variables de entorno..."

# Generar JWT_SECRET si no existe
JWT_SECRET=$(openssl rand -base64 32)

# Crear archivo .env del servidor
cat > $APP_DIR/server/.env << EOF
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h
DATABASE_URL=file:./prisma/dev.db
CORS_ORIGIN=*
RATE_LIMIT_WINDOW_MS=15 minutes
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
BACKUP_DIR=/opt/inventario-almo/backups
EOF

# Crear archivo .env del cliente
cat > $APP_DIR/client/.env << EOF
VITE_API_URL=http://localhost:3001
EOF

log_info "Variables de entorno configuradas"

# ============================================
# Paso 9: Instalar dependencias del servidor
# ============================================
log_step "Instalando dependencias del servidor..."
cd $APP_DIR/server
npm install --production
# IMPORTANTE: Instalar tsx para ejecutar el servidor
npm install --save-dev tsx

# ============================================
# Paso 10: Instalar dependencias del cliente
# ============================================
log_step "Instalando dependencias del cliente..."
cd $APP_DIR/client
npm install

# ============================================
# Paso 11: Generar Prisma Client y Base de Datos
# ============================================
log_step "Generando Prisma Client..."
cd $APP_DIR/server
npx prisma generate

log_step "Creando base de datos..."
npx prisma db push

# ============================================
# Paso 12: Crear usuario administrador
# ============================================
log_step "Creando usuario administrador..."

cat > $APP_DIR/server/create_admin.js << 'EOFADMIN'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: 'jorge.canel@grupoalmo.com' }
  });
  
  if (existing) {
    console.log('Usuario ya existe:', existing.email);
    return;
  }
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const user = await prisma.user.create({
    data: {
      email: 'jorge.canel@grupoalmo.com',
      password: hashedPassword,
      nombre: 'Jorge Canel',
      rol: 'admin',
      activo: true
    }
  });
  
  console.log('Usuario creado:', user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
EOFADMIN

cd $APP_DIR/server
node create_admin.js
rm create_admin.js

# ============================================
# Paso 13: Build del Frontend
# ============================================
log_step "Building frontend..."
cd $APP_DIR/client
npm run build

# ============================================
# Paso 14: Configurar Nginx
# ============================================
log_step "Configurando Nginx..."
cp $APP_DIR/nginx.conf /etc/nginx/sites-available/inventario-almo
ln -sf /etc/nginx/sites-available/inventario-almo /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t

# ============================================
# Paso 15: Configurar PM2
# ============================================
log_step "Configurando PM2..."
cd $APP_DIR

# ============================================
# Paso 16: Iniciar servicios
# ============================================
log_step "Iniciando servicios con PM2..."
pm2 delete inventario-backend inventario-frontend 2>/dev/null || true
pm2 start ecosystem.config.js

# Guardar configuración de PM2 para auto-inicio
pm2 save

# ============================================
# Paso 17: Reiniciar Nginx
# ============================================
log_step "Reiniciando Nginx..."
systemctl enable nginx
systemctl restart nginx

# ============================================
# Resumen
# ============================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  INSTALACIÓN COMPLETADA${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Frontend: ${BLUE}http://$(hostname -I | awk '{print $1}')${NC}"
echo -e "Backend:   ${BLUE}http://$(hostname -I | awk '{print $1}'):3001${NC}"
echo ""
echo "Credenciales de acceso:"
echo "  Usuario: jorge.canel@grupoalmo.com"
echo "  Contraseña: admin123"
echo ""
echo "Comandos útiles:"
echo "  pm2 status           - Ver estado de servicios"
echo "  pm2 logs             - Ver logs"
echo "  pm2 restart all     - Reiniciar servicios"
echo ""
echo "Logs:"
echo "  /var/log/inventario-almo/"
echo ""
