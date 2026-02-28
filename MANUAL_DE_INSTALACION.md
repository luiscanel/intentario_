# MANUAL DE INSTALACIÓN
## Inventario Almo - Servidor Dedicado (Sin Docker)

---

## Información General

| Campo | Valor |
|-------|-------|
| **Proyecto** | Inventario Almo |
| **Tech Stack** | React + Vite + Express + Prisma + SQLite |
| **Servidor** | 192.168.0.12 |
| **Usuario Admin** | inventario / root |
| **Contraseña** | 123456789 |

---

## Requisitos del Sistema

- Ubuntu 20.04 LTS o superior (probado en 24.04)
- Node.js 18.x o 20.x (recomendado 20.x)
- Nginx
- PM2 (Process Manager)
- 2GB RAM mínimo
- 10GB disco mínimo

---

## Instalación Automática (Recomendado)

### Opción 1: Clonar desde GitHub y ejecutar script

1. **En el servidor**, ejecuta el script de instalación:

```bash
# Conectar al servidor
ssh inventario@192.168.0.12

# Convertirse en root
sudo su

# Ejecutar el script de instalación (clona desde GitHub automáticamente)
curl -sSL https://raw.githubusercontent.com/luiscanel/Host_Dedicado/master/deploy.sh | bash
```

O si ya tienes el proyecto clonado:

```bash
cd /opt/inventario-almo
chmod +x deploy.sh
./deploy.sh
```

# Dar permisos de ejecución al script
chmod +x deploy.sh

# Ejecutar el script de instalación
./deploy.sh
```

---

## Instalación Manual (Paso a Paso)

### 1. Conexión al Servidor

```bash
ssh inventario@192.168.0.12
sudo su
```

### 2. Instalación de Herramientas

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Instalar Nginx
apt install -y nginx

# Instalar PM2 (usar mirror si hay problemas de red)
npm config set registry https://registry.npmmirror.com
npm install -g pm2

# Verificar instalaciones
node --version
nginx -v
pm2 --version
```

### 3. Preparar Directorios

```bash
mkdir -p /opt/inventario-almo
mkdir -p /opt/inventario-almo/backups
mkdir -p /var/log/inventario-almo
chown -R inventario:inventario /opt/inventario-almo
chown -R inventario:inventario /var/log/inventario-almo
```

### 4. Copiar Archivos del Proyecto

Desde tu máquina local:

```bash
scp -r /home/teknao/Escritorio/Proyectos/Inventario_Host_dedicado/* inventario@192.168.0.12:/opt/inventario-almo/
```

### 5. Configurar Variables de Entorno

```bash
cd /opt/inventario-almo

# Generar JWT_SECRET seguro
JWT_SECRET=$(openssl rand -base64 32)

# Crear archivo .env del servidor
cat > server/.env << EOF
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
cat > client/.env << EOF
VITE_API_URL=http://localhost:3001
EOF
```

### 6. Instalar Dependencias

```bash
# Dependencias del servidor
cd /opt/inventario-almo/server
npm install --production
npm install --save-dev tsx  # IMPORTANTE: Necesario para ejecutar el servidor

# Dependencias del cliente
cd /opt/inventario-almo/client
npm install
```

### 7. Generar Prisma y Base de Datos

```bash
cd /opt/inventario-almo/server
npx prisma generate
npx prisma db push
```

⚠️ **IMPORTANTE**: 
- `npx prisma generate` solo genera el cliente, no modifica datos
- `npx prisma db push` crea las tablas, no borra datos existentes

### 8. Crear Usuario Administrador

```bash
cd /opt/inventario-almo/server

cat > create_admin.js << 'EOF'
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
EOF

node create_admin.js
rm create_admin.js
```

### 9. Build del Frontend

```bash
cd /opt/inventario-almo/client
npm run build
```

### 10. Configurar Nginx

```bash
# Copiar configuración
cp /opt/inventario-almo/nginx.conf /etc/nginx/sites-available/inventario-almo

# Habilitar sitio
ln -sf /etc/nginx/sites-available/inventario-almo /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Probar y reiniciar
nginx -t
systemctl restart nginx
```

### 11. Iniciar Servicios con PM2

```bash
cd /opt/inventario-almo
pm2 start ecosystem.config.js
pm2 save
```

---

## Estructura de Archivos

```
/opt/inventario-almo/
├── client/                    # Frontend (React + Vite)
│   ├── dist/                   # Build de producción
│   ├── src/
│   ├── package.json
│   ├── .env
│   └── vite.config.ts
├── server/                     # Backend (Express)
│   ├── src/
│   ├── prisma/
│   │   ├── dev.db             # Base de datos SQLite
│   │   └── schema.prisma
│   ├── package.json
│   └── .env
├── backups/                    # Backups de la base de datos
├── nginx.conf                  # Configuración de Nginx
├── ecosystem.config.js         # Configuración de PM2
├── deploy.sh                   # Script de instalación automática
└── MANUAL_DE_INSTALACION.md
```

---

## Verificación Post-Instalación

### Estado de Servicios

```bash
pm2 status
```

Debería mostrar:
- inventario-backend: online
- inventario-frontend: online

### Probar API

```bash
curl http://localhost:3001/api/health
# Respuesta: {"status":"ok","timestamp":"...","environment":"production"}
```

### Probar Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"jorge.canel@grupoalmo.com","password":"admin123"}'
```

---

## Credenciales de Acceso

| Campo | Valor |
|-------|-------|
| **Usuario** | jorge.canel@grupoalmo.com |
| **Contraseña** | admin123 |

---

## Comandos de Administración

### Ver Logs

```bash
# Ver todos los logs
pm2 logs

# Ver logs específicos
pm2 logs inventario-backend
pm2 logs inventario-frontend

# Ver logs en tiempo real
pm2 logs --lines 100 --nostream
```

### Reiniciar Servicios

```bash
# Reiniciar todos
pm2 restart all

# Reiniciar solo backend
pm2 restart inventario-backend
```

### Detener Servicios

```bash
pm2 stop all
```

### Monitoreo

```bash
pm2 monit
```

---

## Respaldos (Backups)

### Crear Backup Manual

```bash
# En el servidor
cd /opt/inventario-almo/server/prisma
cp dev.db ../../backups/inventario_$(date +%Y%m%d_%H%M%S).db
```

### Restaurar Backup

```bash
# Listar backups disponibles
ls -la /opt/inventario-almo/backups/

# Restaurar (detener servicios primero)
pm2 stop all
cp /opt/inventario-almo/backups/inventario_20240101_120000.db /opt/inventario-almo/server/prisma/dev.db
pm2 start all
```

---

## Errores Comunes y Soluciones

### 1. Error: Cannot find module 'tsx'

**Causa:** No se instaló tsx en el servidor.

**Solución:**
```bash
cd /opt/inventario-almo/server
npm install --save-dev tsx
```

### 2. Error: Cannot find module '@prisma/client'

**Causa:** No se ejecutó prisma generate.

**Solución:**
```bash
cd /opt/inventario-almo/server
npx prisma generate
```

### 3. Error: EACCES permission denied

**Causa:** Permisos incorrectos en carpetas.

**Solución:**
```bash
sudo chown -R inventario:inventario /opt/inventario-almo
sudo chown -R inventario:inventario /var/log/inventario-almo
```

### 4. Error: Puerto en uso

**Causa:** Otro proceso está usando el puerto.

**Solución:**
```bash
# Ver qué proceso usa el puerto
sudo lsof -i :3001
sudo lsof -i :80

# Matar proceso
sudo kill -9 <PID>
```

### 5. Error: Base de datos vacía (no puedo iniciar sesión)

**Causa:** No se creó el usuario administrador.

**Solución:** Ejecutar el script de creación de admin (ver paso 8).

### 6. PM2 no inicia al reiniciar el servidor

**Solución:**
```bash
pm2 startup
# Copiar y ejecutar el comando que aparece
pm2 save
```

---

## Actualización del Proyecto

Para actualizar a una nueva versión:

```bash
# 1. Detener servicios
pm2 stop all

# 2. Respaldar base de datos
cp /opt/inventario-almo/server/prisma/dev.db /opt/inventario-almo/backups/pre-update_$(date +%Y%m%d_%H%M%S).db

# 3. Actualizar archivos (si hay repositorio)
cd /opt/inventario-almo
git pull

# 4. Reinstalar dependencias
cd server && npm install && npm install --save-dev tsx
cd ../client && npm install

# 5. Regenerar Prisma (solo si hay cambios en schema)
cd ../server
npx prisma generate

# 6. Rebuild frontend
cd ../client
npm run build

# 7. Reiniciar servicios
pm2 restart all
```

---

## SSL (HTTPS) - Opcional

Para habilitar HTTPS con Let's Encrypt:

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado (reemplazar dominio)
sudo certbot --nginx -d inventario.grupoalmo.com
```

---

## Notas Importantes

1. **Node.js**: El servidor tiene Node.js 18.x. El proyecto requiere tsx para ejecutarse en producción.
2. **Base de datos**: SQLite. El archivo está en `/opt/inventario-almo/server/prisma/dev.db`
3. **Backups**: Hacer backups regulares de la base de datos.
4. **Logs**: Los logs están en `/var/log/inventario-almo/`

---

*Documento generado para Inventario Almo - Versión 1.0*
*Fecha: 28 de febrero de 2026*
