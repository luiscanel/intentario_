#!/bin/bash

# ============================================
# Script de Diagnóstico y Reparación
# Inventario Almo - Base de Datos
# ============================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_DIR="/opt/inventario-almo"
SERVER_DIR="$APP_DIR/server"
PRISMA_DIR="$SERVER_DIR/prisma"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  DIAGNÓSTICO DE BASE DE DATOS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ============================================
# Paso 1: Verificar estructura de directorios
# ============================================
echo -e "${YELLOW}[1] Verificando estructura de directorios...${NC}"

if [ ! -d "$PRISMA_DIR" ]; then
    echo -e "${RED}✗ No existe el directorio: $PRISMA_DIR${NC}"
    mkdir -p "$PRISMA_DIR"
    echo -e "${GREEN}✓ Directorio creado: $PRISMA_DIR${NC}"
else
    echo -e "${GREEN}✓ Directorio existe: $PRISMA_DIR${NC}"
fi

# ============================================
# Paso 2: Verificar archivo .env
# ============================================
echo ""
echo -e "${YELLOW}[2] Verificando archivo .env...${NC}"

if [ -f "$SERVER_DIR/.env" ]; then
    echo -e "${GREEN}✓ Archivo .env existe: $SERVER_DIR/.env${NC}"
    echo "Contenido actual:"
    cat "$SERVER_DIR/.env"
    echo ""
else
    echo -e "${RED}✗ No existe el archivo .env${NC}"
    echo -e "${YELLOW}Creando archivo .env...${NC}"
    
    JWT_SECRET=$(openssl rand -base64 32)
    
    cat > "$SERVER_DIR/.env" << EOF
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
    
    echo -e "${GREEN}✓ Archivo .env creado${NC}"
fi

# ============================================
# Paso 3: Verificar base de datos existente
# ============================================
echo ""
echo -e "${YELLOW}[3] Buscando base de datos...${NC}"

DB_PATH="$PRISMA_DIR/dev.db"

if [ -f "$DB_PATH" ]; then
    echo -e "${GREEN}✓ Base de datos encontrada: $DB_PATH${NC}"
    ls -la "$DB_PATH"
else
    echo -e "${YELLOW}⚠ Base de datos no encontrada en: $DB_PATH${NC}"
    
    # Buscar en otras ubicaciones
    echo ""
    echo "Buscando en otras ubicaciones..."
    FOUND_DB=$(find "$APP_DIR" -name "*.db" 2>/dev/null || true)
    
    if [ -n "$FOUND_DB" ]; then
        echo "Bases de datos encontradas:"
        echo "$FOUND_DB"
    else
        echo "No se encontró ninguna base de datos SQLite"
    fi
fi

# ============================================
# Paso 4: Regenerar Prisma Client
# ============================================
echo ""
echo -e "${YELLOW}[4] Regenerando Prisma Client...${NC}"

cd "$SERVER_DIR"
npx prisma generate

echo -e "${GREEN}✓ Prisma Client regenerado${NC}"

# ============================================
# Paso 5: Crear/Migrar base de datos
# ============================================
echo ""
echo -e "${YELLOW}[5] Creando/migrando base de datos...${NC}"

cd "$SERVER_DIR"

# Forzar el uso de la ruta absoluta
export DATABASE_URL="file:$PRISMA_DIR/dev.db"

echo "DATABASE_URL: $DATABASE_URL"

npx prisma db push --force-reset

echo -e "${GREEN}✓ Base de datos creada/migrada${NC}"

# ============================================
# Paso 6: Verificar que la base de datos existe
# ============================================
echo ""
echo -e "${YELLOW}[6] Verificando base de datos...${NC}"

if [ -f "$PRISMA_DIR/dev.db" ]; then
    echo -e "${GREEN}✓ Base de datos creada exitosamente: $PRISMA_DIR/dev.db${NC}"
    ls -la "$PRISMA_DIR/dev.db"
else
    echo -e "${RED}✗ ERROR: La base de datos no se creó${NC}"
    exit 1
fi

# ============================================
# Paso 7: Crear usuario administrador
# ============================================
echo ""
echo -e "${YELLOW}[7] Creando usuario administrador...${NC}"

cd "$SERVER_DIR"

cat > create_admin_temp.js << 'EOFADMIN'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    const existing = await prisma.user.findUnique({
      where: { email: 'jorge.canel@grupoalmo.com' }
    });
    
    if (existing) {
      console.log('Usuario ya existe:', existing.email);
      console.log('Actualizando contraseña...');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await prisma.user.update({
        where: { email: 'jorge.canel@grupoalmo.com' },
        data: { password: hashedPassword }
      });
      
      console.log('✓ Contraseña actualizada');
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
    
    console.log('✓ Usuario creado:', user.email);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
EOFADMIN

node create_admin_temp.js
rm create_admin_temp.js

echo -e "${GREEN}✓ Usuario administrador creado/actualizado${NC}"

# ============================================
# Paso 8: Reiniciar servicios
# ============================================
echo ""
echo -e "${YELLOW}[8] Reiniciando servicios...${NC}"

pm2 restart all

echo -e "${GREEN}✓ Servicios reiniciados${NC}"

# ============================================
# Resumen
# ============================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  DIAGNÓSTICO COMPLETADO${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Ubicación de la base de datos:"
echo "  $PRISMA_DIR/dev.db"
echo ""
echo "Credenciales de acceso:"
echo "  Usuario: jorge.canel@grupoalmo.com"
echo "  Contraseña: admin123"
echo ""
echo "Verificar con:"
echo "  pm2 status"
echo "  curl http://localhost:3001/api/health"
echo ""
