#!/bin/bash
# ============================================
# Script de Instalación - Inventario Almo
# Servidor Dedicado: 192.168.0.20
# ============================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración
SERVER_IP="192.168.0.20"
SSH_USER="inventario"
SSH_PASS="123456789"
PROJECT_DIR="/opt/inventario-almo"
NODE_VERSION="20"

echo -e "${GREEN}=== INSTALACIÓN INVENTARIO ALMO ===${NC}"
echo "Servidor: $SERVER_IP"
echo "Usuario: $SSH_USER"
echo ""

# ============================================
# 1. INSTALAR NODE.JS
# ============================================
echo -e "${YELLOW}[1/8] Instalando Node.js $NODE_VERSION.x...${NC}"

sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP "echo '$SSH_PASS' | sudo -S bash -c 'curl -fsSL https://deb.nodesource.com/setup_$NODE_VERSION.x | bash - && apt-get install -y nodejs'" 2>&1 | tail -10

echo -e "${GREEN}✓ Node.js instalado${NC}"

# ============================================
# 2. CLONAR PROYECTO
# ============================================
echo -e "${YELLOW}[2/8] Clonando proyecto...${NC}"

sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP "echo '$SSH_PASS' | sudo -S bash -c 'cd /opt && rm -rf inventario-almo && git clone https://github.com/luiscanel/intentario_.git inventario-almo && chown -R $SSH_USER:$SSH_USER /opt/inventario-almo'" 2>&1 | tail -5

echo -e "${GREEN}✓ Proyecto clonado${NC}"

# ============================================
# 3. INSTALAR DEPENDENCIAS
# ============================================
echo -e "${YELLOW}[3/8] Instalando dependencias...${NC}"

echo "  - Dependencias del servidor..."
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP "cd $PROJECT_DIR/server && npm install" 2>&1 | tail -5

echo "  - Dependencias del cliente..."
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP "cd $PROJECT_DIR/client && npm install" 2>&1 | tail -5

echo -e "${GREEN}✓ Dependencias instaladas${NC}"

# ============================================
# 4. CONFIGURAR VARIABLES DE ENTORNO
# ============================================
echo -e "${YELLOW}[4/8] Configurando variables de entorno...${NC}"

sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP "echo '$SSH_PASS' | sudo -S bash -c 'cat > $PROJECT_DIR/server/.env << EOF
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
chown $SSH_USER:$SSH_USER $PROJECT_DIR/server/.env'" 2>&1

echo -e "${GREEN}✓ Variables de entorno configuradas${NC}"

# ============================================
# 5. CREAR BASE DE DATOS
# ============================================
echo -e "${YELLOW}[5/8] Creando base de datos...${NC}"

sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP "cd $PROJECT_DIR/server && npx prisma generate && npx prisma db push" 2>&1 | tail -10

echo -e "${GREEN}✓ Base de datos creada${NC}"

# ============================================
# 6. CREAR USUARIO ADMINISTRADOR
# ============================================
echo -e "${YELLOW}[6/8] Creando usuario administrador...${NC}"

sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP "cd $PROJECT_DIR && node create_admin.js" 2>&1

echo -e "${GREEN}✓ Usuario admin creado: jorge.canel@grupoalmo.com / admin123${NC}"

# ============================================
# 7. COMPILAR PROYECTO
# ============================================
echo -e "${YELLOW}[7/8] Compilando proyecto...${NC}"

echo "  - Compilando servidor..."
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP "cd $PROJECT_DIR/server && npm run build" 2>&1 | tail -5

echo "  - Compilando cliente..."
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP "cd $PROJECT_DIR && npm run build" 2>&1 | tail -10

echo -e "${GREEN}✓ Proyecto compilado${NC}"

# ============================================
# 8. CONFIGURAR PM2 Y NGINX
# ============================================
echo -e "${YELLOW}[8/8] Configurando PM2 y Nginx...${NC}"

# Instalar PM2
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP "echo '$SSH_PASS' | sudo -S npm install -g pm2" 2>&1 | tail -5

# Crear configuración PM2
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP "cat > $PROJECT_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'inventario-server',
      script: 'server/dist/index.js',
      cwd: '$PROJECT_DIR',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/inventario/error.log',
      out_file: '/var/log/inventario/out.log',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    }
  ]
}
EOF
echo '$SSH_PASS' | sudo -S mkdir -p /var/log/inventario && echo '$SSH_PASS' | sudo -S chown -R $SSH_USER:$SSH_USER /var/log/inventario"

# Iniciar servidor con PM2
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP "cd $PROJECT_DIR && pm2 start ecosystem.config.js && pm2 save" 2>&1 | tail -10

# Instalar y configurar Nginx
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP "echo '$SSH_PASS' | sudo -S apt-get install -y nginx" 2>&1 | tail -5

# Subir configuración Nginx
sshpass -p "$SSH_PASS" scp -o StrictHostKeyChecking=no /home/teknao/Escritorio/Proyectos/Inventario_Host_dedicado/nginx-simple.conf $SSH_USER@$SERVER_IP:/tmp/nginx.conf

sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP "echo '$SSH_PASS' | sudo -S bash -c 'mv /tmp/nginx.conf /etc/nginx/sites-available/inventario-almo && ln -sf /etc/nginx/sites-available/inventario-almo /etc/nginx/sites-enabled/ && nginx -t && systemctl restart nginx'" 2>&1

echo -e "${GREEN}✓ PM2 y Nginx configurados${NC}"

# ============================================
# VERIFICACIÓN FINAL
# ============================================
echo ""
echo -e "${GREEN}=== INSTALACIÓN COMPLETA ===${NC}"
echo ""
echo "Acceso a la aplicación:"
echo "  - URL: http://$SERVER_IP"
echo "  - API: http://$SERVER_IP/api"
echo ""
echo "Credenciales de administrador:"
echo "  - Email: jorge.canel@grupoalmo.com"
echo "  - Contraseña: admin123"
echo ""
echo "Comandos útiles:"
echo "  - Ver logs: pm2 logs inventario-server"
echo "  - Reiniciar: pm2 restart inventario-server"
echo "  - Estado: pm2 status"
echo "  - Nginx: sudo systemctl restart nginx"
echo ""
