#!/bin/bash
# ============================================
# ONE-INSTALL: Inventario Almo
# Instalación automática en un solo paso
# ============================================

set -e

# ============================================
# CONFIGURACIÓN (Editar según necesidad)
# ============================================
# Valores por defecto - cambiar para producción
SERVER_IP="${SERVER_IP:-}"
SSH_USER="${SSH_USER:-inventario}"
SSH_PASS="${SSH_PASS:-}"
GITHUB_TOKEN="github_pat_11BQIYCZQ0DhCZKWFYl898_LtBJdAKIElaGJgQDa973iqyboSXVEkANk8jOCTLIHR5B6SMOHOPJDjYuuC"
PROJECT_DIR="/opt/inventario-almo"

# Si no se pasaron credenciales, solicitarlas interactivamente
if [ -z "$SERVER_IP" ]; then
    echo -n "Ingrese la IP del servidor: "
    read SERVER_IP
fi

if [ -z "$SSH_PASS" ]; then
    echo -n "Ingrese la contraseña SSH: "
    read -s SSH_PASS
    echo
fi

PROJECT_REPO="https://${GITHUB_TOKEN}@github.com/luiscanel/intentario_.git"

# Contraseña admin (generar aleatoria si no se especifica)
ADMIN_PASS="${ADMIN_PASS:-}"
if [ -z "$ADMIN_PASS" ]; then
    ADMIN_PASS=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9' | head -c 12)
fi
export ADMIN_PASS

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
# FUNCIONES AUXILIARES
# ============================================

cmd_ssh() {
    sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 $SSH_USER@$SERVER_IP "$1" 2>/dev/null
}

cmd_sudo() {
    sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP "echo '$SSH_PASS' | sudo -S bash -c '$1'" 2>&1
}

cmd_scp() {
    sshpass -p "$SSH_PASS" scp -o StrictHostKeyChecking=no "$1" $SSH_USER@$SERVER_IP:"$2" 2>/dev/null
}

# ============================================
# VERIFICAR CONEXIÓN
# ============================================
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════╗"
echo "║     INSTALACIÓN INVENTARIO ALMO - ONE-INSTALL     ║"
echo "╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"

log_info "Verificando conexión a $SERVER_IP..."
if cmd_ssh "echo 'Conexión OK'"; then
    log_ok "Conexión exitosa"
else
    log_error "No se puede conectar al servidor"
    exit 1
fi

# ============================================
# 1. INSTALAR NODE.JS
# ============================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW} 1. INSTALANDO NODE.JS 20.x${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

log_info "Instalando Node.js..."
cmd_sudo "curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs" | tail -5
log_ok "Node.js $(cmd_ssh 'node -v') instalado"

# ============================================
# 2. CLONAR PROYECTO
# ============================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW} 2. CLONANDO PROYECTO${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

log_info "Clonando repositorio..."
cmd_sudo "cd /opt && rm -rf inventario-almo && git clone $PROJECT_REPO inventario-almo && chown -R $SSH_USER:$SSH_USER /opt/inventario-almo" | tail -3
log_ok "Proyecto clonado en $PROJECT_DIR"

# ============================================
# 3. INSTALAR DEPENDENCIAS
# ============================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW} 3. INSTALANDO DEPENDENCIAS${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

log_info "Instalando dependencias del servidor..."
cmd_ssh "cd $PROJECT_DIR/server && npm install --prefer-offline" | tail -3

log_info "Instalando dependencias del cliente..."
cmd_ssh "cd $PROJECT_DIR/client && npm install --prefer-offline" | tail -3
log_ok "Dependencias instaladas"

# ============================================
# 4. CONFIGURAR ENTORNO
# ============================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW} 4. CONFIGURANDO ENTORNO${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

log_info "Creando archivo .env..."
cmd_sudo "cat > $PROJECT_DIR/server/.env << 'EOF'
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
chown $SSH_USER:$SSH_USER $PROJECT_DIR/server/.env"
log_ok "Variables de entorno configuradas"

# ============================================
# 5. BASE DE DATOS
# ============================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW} 5. CREANDO BASE DE DATOS${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

log_info "Generando Prisma Client..."
cmd_ssh "cd $PROJECT_DIR/server && npx prisma generate" | tail -3

log_info "Creando base de datos..."
cmd_ssh "cd $PROJECT_DIR/server && npx prisma db push" | tail -5
log_ok "Base de datos SQLite creada"

# ============================================
# 6. USUARIO ADMIN
# ============================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW} 6. CREANDO ADMINISTRADOR${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cmd_ssh "cd $PROJECT_DIR/server && npm install bcrypt --save-dev 2>&1 | tail -2"

cmd_ssh "cd $PROJECT_DIR/server && node -e \"
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const email = 'jorge.canel@grupoalmo.com';
  const password = '$ADMIN_PASS';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) { console.log('Usuario ya existe:', email); return; }
  const hash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { email, password: hash, nombre: 'Jorge Canel', rol: 'admin', activo: true, debeCambiarPass: false } });
  console.log('Usuario admin creado:', email);
}
main().catch(console.error).finally(() => prisma.\$disconnect());
\""
log_ok "Usuario admin creado: jorge.canel@grupoalmo.com / $ADMIN_PASS"

# ============================================
# 7. COMPILAR
# ============================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW} 7. COMPILANDO PROYECTO${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

log_info "Compilando servidor..."
cmd_ssh "cd $PROJECT_DIR/server && npm run build" | tail -3

log_info "Compilando cliente..."
cmd_ssh "cd $PROJECT_DIR && npm run build" | tail -5
log_ok "Build completado"

# ============================================
# 8. PM2
# ============================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW} 8. CONFIGURANDO PM2${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

log_info "Instalando PM2..."
cmd_sudo "npm install -g pm2" | tail -3

log_info "Creando configuración PM2..."
cmd_ssh "cat > $PROJECT_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'inventario-server',
    script: 'server/dist/index.js',
    cwd: '$PROJECT_DIR',
    instances: 1,
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production', PORT: 3001 },
    error_file: '/var/log/inventario/error.log',
    out_file: '/var/log/inventario/out.log',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
}
EOF"

cmd_sudo "mkdir -p /var/log/inventario && chown -R $SSH_USER:$SSH_USER /var/log/inventario"

log_info "Iniciando servidor..."
cmd_ssh "cd $PROJECT_DIR && pm2 start ecosystem.config.js && pm2 save" | tail -10
log_ok "PM2 iniciado"

# ============================================
# 9. NGINX
# ============================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW} 9. CONFIGURANDO NGINX${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

log_info "Instalando Nginx..."
cmd_sudo "apt-get install -y nginx" | tail -3

log_info "Configurando proxy reverso..."
cmd_sudo 'cat > /etc/nginx/sites-available/inventario-almo << "EOFCONF"
server {
    listen 80;
    server_name _;

    location / {
        root '$PROJECT_DIR'/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    access_log /var/log/nginx/inventario_access.log;
    error_log /var/log/nginx/inventario_error.log;
}
EOFCONF
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/inventario-almo /etc/nginx/sites-enabled/'

cmd_sudo 'nginx -t && systemctl restart nginx' | tail -3
log_ok "Nginx configurado"

# ============================================
# VERIFICACIÓN FINAL
# ============================================
echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW} 10. VERIFICANDO INSTALACIÓN${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

sleep 2

# Verificar API
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP/api/health 2>/dev/null || echo "000")
if [ "$API_STATUS" = "200" ]; then
    log_ok "API respondiendo correctamente"
else
    log_warn "API responded: $API_STATUS"
fi

# Verificar Frontend
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP/ 2>/dev/null || echo "000")
if [ "$WEB_STATUS" = "200" ]; then
    log_ok "Frontend respondiendo correctamente"
else
    log_warn "Frontend responded: $WEB_STATUS"
fi

# ============================================
# RESUMEN
# ============================================
echo -e "\n${GREEN}"
echo "╔═══════════════════════════════════════════════════╗"
echo "║           INSTALACIÓN COMPLETADA                   ║"
echo "╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}📍 ACCESO:${NC}"
echo "   • Aplicación: http://$SERVER_IP"
echo "   • API: http://$SERVER_IP/api"
echo ""
echo -e "${BLUE}🔐 CREDENCIALES:${NC}"
echo "   • Email: jorge.canel@grupoalmo.com"
echo "   • Password: $ADMIN_PASS"
echo ""
echo -e "${BLUE}🛠️  COMANDOS ÚTILES:${NC}"
echo "   • Ver logs: pm2 logs inventario-server"
echo "   • Reiniciar: pm2 restart inventario-server"
echo "   • Estado: pm2 status"
echo "   • Nginx: sudo systemctl restart nginx"
echo ""
echo -e "${BLUE}📁 ARCHIVOS:${NC}"
echo "   • Proyecto: $PROJECT_DIR"
echo "   • Base de datos: $PROJECT_DIR/server/prisma/prod.db"
echo "   • Logs PM2: /var/log/inventario/"
echo "   • Logs Nginx: /var/log/nginx/inventario_*.log"
echo ""

# Test de login
echo -e "${BLUE}🧪 TEST DE LOGIN:${NC}"
LOGIN_RESULT=$(curl -s -X POST http://$SERVER_IP/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"jorge.canel@grupoalmo.com\",\"password\":\"$ADMIN_PASS\"}")

if echo "$LOGIN_RESULT" | grep -q "token"; then
    log_ok "Login exitoso"
else
    log_warn "Login: $(echo $LOGIN_RESULT | head -c 100)"
fi

echo ""
