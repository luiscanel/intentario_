#!/bin/bash
# ============================================
# INSTALACIÓN PASO A PASO - Inventario Almo
# Servidor Dedicado Ubuntu 24.04
# ============================================

set -e

# Colores para输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================
# VARIABLES - CONFIGURA ESTOS VALORES
# ============================================
# Detectar IP automáticamente
SERVER_IP=$(hostname -I | awk '{print $1}')
DOMAIN_OR_IP="${SERVER_IP}"        # Se detectará automáticamente
ADMIN_EMAIL="jorge.canel@grupoalmo.com"
ADMIN_PASSWORD="admin123"
MYSQL_ROOT_PASSWORD=""  # Dejar vacío si no necesitas MySQL externo
GIT_REPO="https://github.com/luiscanel/intentario_.git"

# ============================================
# VERIFICAR QUE SE EJECUTA COMO ROOT
# ============================================
if [ "$EUID" -ne 0 ]; then
  print_error "Este script debe ejecutarse como root"
  echo "Ejecuta: sudo ./install-step-by-step.sh"
  exit 1
fi

# ============================================
# VERIFICAR PUERTOS
# ============================================
print_status "Verificando puertos del sistema..."

check_port() {
  local port=$1
  local service=$2
  if ss -tuln 2>/dev/null | grep -q ":$port "; then
    print_warning "Puerto $port ($service) ya está en uso"
    return 1
  fi
  return 0
}

# Verificar puertos críticos
PORTS_OK=true
check_port 22 "SSH" || PORTS_OK=false
check_port 80 "HTTP" || PORTS_OK=false
check_port 443 "HTTPS" || PORTS_OK=false
check_port 3001 "Backend" || PORTS_OK=false

if [ "$PORTS_OK" = false ]; then
  print_warning "Algunos puertos están en uso. La instalación puede fallar."
  read -p "¿Continuar de todos modos? (s/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    exit 1
  fi
fi

print_status "Iniciando instalación de Inventario Almo..."
echo ""

# ============================================
# PASO 1: ACTUALIZAR SISTEMA
# ============================================
echo -e "${BLUE}=========================================="
echo "PASO 1: Actualizando sistema"
echo -e "==========================================${NC}"

apt update && apt upgrade -y
print_success "Sistema actualizado"

# ============================================
# PASO 2: INSTALAR DEPENDENCIAS
# ============================================
echo -e "${BLUE}=========================================="
echo "PASO 2: Instalando dependencias"
echo -e "==========================================${NC}"

apt install -y curl wget git unzip sudo gnupg ca-certificates lsb-release build-essential nginx ufw fail2ban sshpass openssl software-properties-common

print_success "Dependencias instaladas"

# ============================================
# PASO 3: INSTALAR NODE.JS 20.X
# ============================================
echo -e "${BLUE}=========================================="
echo "PASO 3: Instalando Node.js 20.x"
echo -e "==========================================${NC}"

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

node --version
npm --version
print_success "Node.js instalado"

# ============================================
# PASO 4: CREAR USUARIO DEL SISTEMA
# ============================================
echo -e "${BLUE}=========================================="
echo "PASO 4: Creando usuario del sistema"
echo -e "==========================================${NC}"

if id "inventario" &>/dev/null; then
  print_warning "El usuario 'inventario' ya existe"
else
  useradd -m -s /bin/bash -G sudo inventario
  echo "inventario:123456789" | chpasswd
  print_success "Usuario 'inventario' creado"
fi

# ============================================
# PASO 5: CLONAR PROYECTO
# ============================================
echo -e "${BLUE}=========================================="
echo "PASO 5: Clonando proyecto"
echo -e "==========================================${NC}"

cd /opt

# Si el repositorio existe, actualizar; si no, clonar
if [ -d "/opt/inventario-almo" ]; then
  print_warning "El proyecto ya existe en /opt/inventario-almo"
  cd inventario-almo
  git pull
else
  git clone "$GIT_REPO" inventario-almo
  cd inventario-almo
fi

chown -R inventario:inventario .
print_success "Proyecto clonado en /opt/inventario-almo"

# ============================================
# PASO 6: INSTALAR DEPENDENCIAS NPM
# ============================================
echo -e "${BLUE}=========================================="
echo "PASO 6: Instalando dependencias npm"
echo -e "==========================================${NC}"

sudo -u inventario npm install
print_success "Dependencias npm instaladas"

# ============================================
# PASO 7: CONFIGURAR VARIABLES DE ENTORNO
# ============================================
echo -e "${BLUE}=========================================="
echo "PASO 7: Configurando variables de entorno"
echo -e "==========================================${NC}"

cd /opt/inventario-almo/server

# Crear directorio prisma si no existe
mkdir -p prisma/prisma

# Verificar si ya existe .env y mantener JWT_SECRET
if [ -f .env ]; then
  print_warning "El archivo .env ya existe, preservando configuración existente"
  source .env
  # Mantener el JWT_SECRET existente o generar uno nuevo si no existe
  if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
  fi
else
  JWT_SECRET=$(openssl rand -base64 32)
fi

# Crear archivo .env con ruta ABSOLUTA a la base de datos
cat > .env << EOF
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=24h
DATABASE_URL=file:/opt/inventario-almo/server/prisma/prisma/dev.db
CORS_ORIGIN=https://${DOMAIN_OR_IP}
RATE_LIMIT_WINDOW_MS=15 minutes
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
EOF

chown inventario:inventario .env
chmod 600 .env
print_success "Variables de entorno configuradas"

# ============================================
# PASO 8: GENERAR BASE DE DATOS
# ============================================
echo -e "${BLUE}=========================================="
echo "PASO 8: Generando base de datos"
echo -e "==========================================${NC}"

cd /opt/inventario-almo/server
sudo -u inventario npm install
sudo -u inventario npx prisma generate

# Verificar si la base de datos ya existe
DB_PATH="/opt/inventario-almo/server/prisma/prisma/dev.db"
if [ -f "$DB_PATH" ]; then
  print_warning "La base de datos ya existe en $DB_PATH"
  print_status "El script de instalación sincronizará los datos sin borrarlos"
  print_status "Tus usuarios y configuraciones se mantendrán"
else
  sudo -u inventario npx prisma db push
  print_success "Base de datos creada"
fi

# ============================================
# PASO 9: CREAR USUARIO ADMIN
# ============================================
echo -e "${BLUE}=========================================="
echo "PASO 9: Creando usuario administrador"
echo -e "==========================================${NC}"

cd /opt/inventario-almo/server

# Pasar credenciales como variables de entorno
export ADMIN_EMAIL="$ADMIN_EMAIL"
export ADMIN_PASSWORD="$ADMIN_PASSWORD"

# Crear usuario admin con credenciales configurables
sudo -u inventario ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" node create_admin.js
print_success "Usuario admin creado"

# Sincronizar módulos, roles y permisos del sistema
print_status "Sincronizando módulos y roles del sistema..."
print_warning "⚠️ Los datos existentes NO se borrarán"
sudo -u inventario npx tsx scripts/inicializar_sistema.ts
print_success "Sistema sincronizado"

# ============================================
# PASO 10: COMPILAR FRONTEND
# ============================================
echo -e "${BLUE}=========================================="
echo "PASO 10: Compilando frontend"
echo -e "==========================================${NC}"

cd /opt/inventario-almo/client
sudo -u inventario npm run build
print_success "Frontend compilado"

# ============================================
# PASO 11: INSTALAR PM2
# ============================================
echo -e "${BLUE}=========================================="
echo "PASO 11: Instalando PM2"
echo -e "==========================================${NC}"

npm install -g pm2

# Crear directorio de logs
mkdir -p /var/log/inventario
chown -R inventario:inventario /var/log/inventario
print_success "PM2 instalado"

# ============================================
# PASO 12: CONFIGURAR PM2
# ============================================
echo -e "${BLUE}=========================================="
echo "PASO 12: Configurando PM2"
echo -e "==========================================${NC}"

cd /opt/inventario-almo

# Modificar ecosystem.config.js para rutas absolutas
sed -i "s|cwd: './server'|cwd: '/opt/inventario-almo/server'|g" ecosystem.config.js
sed -i "s|cwd: './client'|cwd: '/opt/inventario-almo/client'|g" ecosystem.config.js

# Iniciar servicios
sudo -u inventario pm2 start ecosystem.config.js
sudo -u inventario pm2 save

print_success "PM2 configurado y servicios iniciados"

# ============================================
# PASO 13: CONFIGURAR NGINX
# ============================================
echo -e "${BLUE}=========================================="
echo "PASO 13: Configurando Nginx"
echo -e "==========================================${NC}"

# Copiar configuración
cp /opt/inventario-almo/nginx.conf /etc/nginx/sites-available/inventario-almo
ln -sf /etc/nginx/sites-available/inventario-almo /etc/nginx/sites-enabled/

# Generar certificado SSL autofirmado
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/ssl-cert-snakeoil.key \
    -out /etc/ssl/certs/ssl-cert-snakeoil.pem \
    -subj "/C=ES/ST=Madrid/L=Madrid/O=Inventario/CN=$DOMAIN_OR_IP"

# Reiniciar Nginx
nginx -t
systemctl restart nginx

print_success "Nginx configurado"

# ============================================
# PASO 14: CONFIGURAR FIREWALL
# ============================================
echo -e "${BLUE}=========================================="
echo "PASO 14: Configurando firewall"
echo -e "==========================================${NC}"

ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
ufw status

print_success "Firewall configurado"

# ============================================
# RESUMEN FINAL
# ============================================
echo ""
echo -e "${GREEN}=========================================="
echo "INSTALACIÓN COMPLETADA"
echo -e "==========================================${NC}"
echo ""
echo -e "Acceso a la aplicación:"
echo -e "  URL: ${GREEN}https://$DOMAIN_OR_IP${NC}"
echo -e "  Usuario: ${GREEN}$ADMIN_EMAIL${NC}"
echo -e "  Contraseña: ${GREEN}$ADMIN_PASSWORD${NC}"
echo ""
echo -e "Comandos útiles:"
echo -e "  Ver estado:    ${YELLOW}sudo su - inventario -c \"pm2 status\"${NC}"
echo -e "  Ver logs:      ${YELLOW}sudo su - inventario -c \"pm2 logs\"${NC}"
echo -e "  Reiniciar:     ${YELLOW}sudo su - inventario -c \"pm2 restart all\"${NC}"
echo ""
echo -e "${RED}NOTA: El certificado SSL es autofirmado.${NC}"
echo -e "${RED}      Para producción, usa Let's Encrypt.${NC}"
echo ""
