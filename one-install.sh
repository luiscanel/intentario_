#!/bin/bash
# ============================================
# ONE-INSTALL: Inventario Almo
# Instalación automática en un solo paso (LOCAL)
# ============================================

set -e

# ============================================
# CONFIGURACIÓN
# ============================================
EXEC_MODE="${EXEC_MODE:-local}"
SERVER_IP="${SERVER_IP:-$(hostname -I | awk '{print $1}')}"
PROJECT_DIR="/opt/inventario-almo"
SSH_USER="inventario"
SSH_PASS="${SSH_PASS:-123456789}"
GITHUB_TOKEN="github_pat_11BQIYCZQ0DhCZKWFYl898_LtBJdAKIElaGJgQDa973iqyboSXVEkANk8jOCTLIHR5B6SMOHOPJDjYuuC"
PROJECT_REPO="https://${GITHUB_TOKEN}@github.com/luiscanel/intentario_.git"

ADMIN_EMAIL="${ADMIN_EMAIL:-jorge.canel@grupoalmo.com}"
ADMIN_PASS="${ADMIN_PASS:-admin123}"
ADMIN_NAME="${ADMIN_NAME:-Jorge Canel}"

# ============================================
# COLORS
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================
# VERIFICAR QUE ES ROOT
# ============================================
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Este script debe ejecutarse como root (sudo)${NC}"
    exit 1
fi

# ============================================
# INICIO
# ============================================
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════╗"
echo "║     INSTALACIÓN INVENTARIO ALMO - ONE-INSTALL     ║"
echo "╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"

log_info "IP del servidor: $SERVER_IP"
log_info "Directorio: $PROJECT_DIR"

# ============================================
# 0. ACTUALIZAR SISTEMA
# ============================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW} 0. ACTUALIZANDO SISTEMA${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

log_info "Actualizando repositorios..."
apt-get update -qq
log_ok "Sistema actualizado"

log_info "Instalando prerrequisitos..."
apt-get install -y -qq curl git build-essential sshpass nginx > /dev/null 2>&1
log_ok "Prerrequisitos instalados"

# ============================================
# 1. CREAR USUARIO INVENTARIO
# ============================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW} 1. CREANDO USUARIO INVENTARIO${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if ! id "inventario" &>/dev/null; then
    log_info "Creando usuario 'inventario'..."
    useradd -m -s /bin/bash inventario
    echo "inventario:$SSH_PASS" | chpasswd
    log_ok "Usuario creado con contraseña: $SSH_PASS"
else
    log_info "Usuario 'inventario' ya existe"
    echo "inventario:$SSH_PASS" | chpasswd
    log_ok "Contraseña actualizada"
fi

# Agregar usuario a sudo sin contraseña (opcional)
echo "inventario ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/inventario
chmod 440 /etc/sudoers.d/inventario

# ============================================
# 2. INSTALAR NODE.JS
# ============================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW} 2. INSTALANDO NODE.JS 20.x${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if ! command -v node &> /dev/null; then
    log_info "Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y -qq nodejs > /dev/null 2>&1
    log_ok "Node.js $(node -v) instalado"
else
    log_ok "Node.js $(node -v) ya instalado"
fi

# ============================================
# 3. CLONAR PROYECTO
# ============================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW} 3. CLONANDO PROYECTO${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

log_info "Clonando repositorio..."
mkdir -p /opt
cd /opt
rm -rf inventario-almo
git clone "$PROJECT_REPO" inventario-almo
chown -R inventario:inventario /opt/inventario-almo
log_ok "Proyecto clonado en $PROJECT_DIR"

# ============================================
# 4. INSTALAR DEPENDENCIAS
# ============================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW} 4. INSTALANDO DEPENDENCIAS${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

log_info "Instalando dependencias del servidor..."
cd $PROJECT_DIR/server
sudo -u inventario npm install --prefer-offline 2>&1 | tail -2

log_info "Instalando dependencias del cliente..."
cd $PROJECT_DIR/client
sudo -u inventario npm install --prefer-offline 2>&1 | tail -2
log_ok "Dependencias instaladas"

# ============================================
# 5. CONFIGURAR ENTORNO
# ============================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW} 5. CONFIGURANDO ENTORNO${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

log_info "Creando archivo .env..."
cat > $PROJECT_DIR/server/.env << EOF
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
JWT_SECRET=inventario_almo_2026_seguro_32_caracteres_minimo
JWT_EXPIRES_IN=24h
DATABASE_URL=file:./prisma/prod.db
CORS_ORIGIN=http://$SERVER_IP
RATE_LIMIT_WINDOW_MS=15 minutes
RATE_LIMIT_MAX_REQUESTS=1000
AUTH_RATE_LIMIT_MAX=5
EOF
chown inventario:inventario $PROJECT_DIR/server/.env
log_ok "Variables de entorno configuradas"

# =====================================