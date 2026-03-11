#!/bin/bash
# INSTALADOR AUTOMÁTICO - Inventario Almo
# Uso: bash install.sh [IP_SERVIDOR]

set -e

SERVER_IP="${1:-local}"
SSH_USER="inventario"
SSH_PASS="123456789"
ADMIN_EMAIL="jorge.canel@grupoalmo.com"
ADMIN_PASS="admin123"
ADMIN_NAME="Jorge Canel"
PROJECT_DIR="/opt/inventario-almo"
GITHUB_TOKEN="github_pat_11BQIYCZQ0DhCZKWFYl898_LtBJdAKIElaGJgQDa973iqyboSXVEkANk8jOCTLIHR5B6SMOHOPJDjYuuC"

RED='\033[0;31m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'
log() { echo -e "${BLUE}[*]${NC} $1"; }
ok() { echo -e "${GREEN}[✓]${NC} $1"; }

if [ "$SERVER_IP" = "local" ]; then MODE="local"; else MODE="remote"; fi

echo ""
echo "╔════════════════════════════════════════╗"
echo "║     INSTALADOR INVENTARIO ALMO          ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Función para ejecutar comandos
run_cmd() {
    if [ "$MODE" = "local" ]; then bash -c "$1" 2>&1; else sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP "$1" 2>&1; fi
}
run_sudo() {
    if [ "$MODE" = "local" ]; then echo "$SSH_PASS" | sudo -S bash -c "$1" 2>&1; else sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP "echo '$SSH_PASS' | sudo -S $1" 2>&1; fi
}

# 1. Actualizar sistema
log "Actualizando sistema..."
run_sudo "apt-get update && apt-get upgrade -y" | tail -2
run_sudo "apt-get install -y curl git build-essential sshpass nginx" | tail -2
ok "Sistema actualizado"

# 2. Instalar Node.js
log "Instalando Node.js 20..."
run_sudo "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -" | tail -2
run_sudo "apt-get install -y nodejs" | tail -2
ok "Node.js instalado"

# 3. Clonar proyecto
log "Clonando proyecto..."
run_sudo "mkdir -p /opt && chown $SSH_USER:$SSH_USER /opt" | tail -1
run_cmd "cd /opt && git clone https://${GITHUB_TOKEN}@github.com/luiscanel/intentario_.git inventario-almo" | tail -3
ok "Proyecto clonado"

# 4. Instalar dependencias
log "Instalando dependencias..."
run_cmd "cd $PROJECT_DIR/server && npm install" | tail -3
run_cmd "cd $PROJECT_DIR/client && npm install" | tail -3
ok "Dependencias instaladas"

# 5. Configurar entorno
log "Configurando entorno..."
run_cmd "cat > $PROJECT_DIR/server/.env << 'EOFENV'
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
JWT_SECRET=inventario_almo_2026_seguro_32_caracteres
JWT_EXPIRES_IN=24h
DATABASE_URL=file:./prisma/prod.db
CORS_ORIGIN=http://$SERVER_IP
EOFENV" | tail -1
ok "Entorno configurado"

# 6. Base de datos
log "Creando base de datos..."
run_cmd "cd $PROJECT_DIR/server && npx prisma generate" | tail -3
run_cmd "cd $PROJECT_DIR/server && npx prisma db push" | tail -3
ok "Base de datos creada"

# 7. Crear admin
log "Creando usuario admin..."
run_cmd "cd $PROJECT_DIR/server && npm install bcrypt" | tail -2
run_cmd "cd $PROJECT_DIR/server && node -e \"
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
    const existing = await prisma.user.findUnique({ where: { email: '$ADMIN_EMAIL' } });
    if (!existing) {
        const hash = await bcrypt.hash('$ADMIN_PASS', 10);
        await prisma.user.create({ data: { email: '$ADMIN_EMAIL', password: hash, nombre: '$ADMIN_NAME', rol: 'admin', activo: true, debeCambiarPass: false } });
        console.log('Admin creado');
    } else { console.log('Admin ya existe'); }
    await prisma.\$disconnect();
})();
\"" | tail -2
ok "Usuario admin creado"

# 8. Compilar
log "Compilando proyecto..."
run_cmd "cd $PROJECT_DIR/server && npm run build" | tail -3
run_cmd "cd $PROJECT_DIR/client && npm run build" | tail -3
ok "Proyecto compilado"

# 9. PM2
log "Configurando PM2..."
run_sudo "npm install -g pm2" | tail -2
run_sudo "mkdir -p /var/log/inventario && chown $SSH_USER:$SSH_USER /var/log/inventario" | tail -1
run_cmd "cd $PROJECT_DIR && pm2 start ecosystem.config.js" | tail -3
run_cmd "pm2 save" | tail -1
ok "PM2 configurado"

# 10. Nginx
log "Configurando Nginx..."
run_cmd "cat > /tmp/nginx.conf << 'EOFNGINX'
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:5174;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOFNGINX" | tail -1
run_sudo "cp /tmp/nginx.conf /etc/nginx/sites-available/inventario-almo" | tail -1
run_sudo "rm -f /etc/nginx/sites-enabled/default" | tail -1
run_sudo "ln -sf /etc/nginx/sites-available/inventario-almo /etc/nginx/sites-enabled/" | tail -1
run_sudo "nginx -t" | tail -2
run_sudo "systemctl restart nginx" | tail -1
ok "Nginx configurado"

echo ""
echo "╔════════════════════════════════════════╗"
echo "║     INSTALACIÓN COMPLETADA             ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "URL: http://$SERVER_IP"
echo "Usuario: $ADMIN_EMAIL"
echo "Contraseña: $ADMIN_PASS"
echo ""
