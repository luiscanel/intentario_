# Inventario Almo

Sistema de gestión de inventario para Grupo Almo.

## 🚀 Instalación en Servidor Dedicado (Ubuntu 24.04)

### Requisitos
- Ubuntu 24.04 Server
- Acceso root al servidor
- Usuario con permisos sudo

### Instalación Automática

```bash
# 1. Conectar al servidor como root
ssh root@192.168.0.X

# 2. Descargar y ejecutar el script de instalación
curl -fsSL https://raw.githubusercontent.com/luiscanel/intentario_/master/install_dedicated.sh -o /tmp/install.sh
bash /tmp/install.sh
```

### Instalación Manual (paso a paso)

```bash
# 1. Actualizar sistema
apt update && apt upgrade -y

# 2. Instalar dependencias
apt install -y curl wget git unzip sudo gnupg ca-certificates lsb-release build-essential nginx ufw fail2ban sshpass openssl

# 3. Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 4. Crear usuario
useradd -m -s /bin/bash -G sudo inventario
echo "inventario:123456789" | chpasswd

# 5. Clonar proyecto
cd /opt
git clone https://github.com/luiscanel/intentario_.git inventario-almo
cd inventario-almo
chown -R inventario:inventario .

# 6. Instalar dependencias
npm install

# 7. Configurar .env
cat > server/.env << EOF
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
JWT_SECRET=tu-secret-aqui
JWT_EXPIRES_IN=24h
DATABASE_URL=file:/opt/inventario-almo/server/prisma/prisma/dev.db
CORS_ORIGIN=https://TU-IP-O-DOMINIO
EOF

# 8. Generar base de datos
cd server
npx prisma generate
npx prisma db push

# 9. Compilar frontend
cd ../client
npm run build

# 10. Instalar PM2 y configurar
npm install -g pm2
mkdir -p /var/log/inventario
chown -R inventario:inventario /var/log/inventario

# 11. Configurar ecosystem.config.js (ver archivo en el repositorio)

# 12. Iniciar servicios
pm2 start /opt/inventario-almo/ecosystem.config.js
pm2 save

# 13. Configurar Nginx (ver archivo nginx.conf en el repositorio)

# 14. Generar certificados SSL
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/ssl-cert-snakeoil.key \
    -out /etc/ssl/certs/ssl-cert-snakeoil.pem \
    -subj "/C=ES/ST=Madrid/L=Madrid/O=Inventario/CN=tu-servidor"

# 15. Reiniciar nginx
systemctl restart nginx
```

### Acceso

- **URL:** `https://192.168.0.X` (HTTP redirige automáticamente a HTTPS)
- **Usuario:** `jorge.canel@grupoalmo.com`
- **Contraseña:** `admin123`

### Comandos útiles

```bash
# Ver estado de servicios
sudo su - inventario -c "pm2 status"

# Ver logs
sudo su - inventario -c "pm2 logs"

# Reiniciar servicios
sudo su - inventario -c "pm2 restart all"

# Detener servicios
sudo su - inventario -c "pm2 stop all"
```

---

## 🐳 Deploy con Docker (Alternativo)

### Requisitos
- Ubuntu 24.04 Server
- Docker y Docker Compose

### Instalación

```bash
# 1. Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 2. Clonar proyecto
git clone https://github.com/luiscanel/intentario_.git
cd intentario_

# 3. Configurar variables de entorno
cp server/.env.example server/.env
nano server/.env
```

### ⚠️ CONFIGURACIÓN DE SEGURIDAD - CORS

**Esto es CRÍTICO para producción.**

CORS controla qué sitios web pueden acceder a tu API:

| Configuración | Seguridad |
|--------------|-----------|
| `*` (wildcard) | ❌ INSEGURA |
| `https://tu-dominio.com` | ✅ SEGURA |

**En producción, el servidor NO arrancará si usas `*`.**

```bash
# Desarrollo
CORS_ORIGIN=http://localhost:5174

# Producción - IMPORTANTE: usar dominio real
CORS_ORIGIN=https://inventario.grupoalmo.com
```

### Ejecutar

```bash
docker-compose up -d --build
docker-compose ps
```

### Acceso Docker

- Frontend: http://tu-servidor:5174
- Backend: http://tu-servidor:3001

---

## 🔧 Mantenimiento

### Respaldar base de datos

```bash
# Servidor dedicado
cp /opt/inventario-almo/server/prisma/prisma/dev.db /backup/inventario-$(date +%Y%m%d).db

# Docker
docker cp inventario-almo-server-1:/app/prisma/dev.db ./backup-inventario-$(date +%Y%m%d).db
```

### Actualizar aplicación

```bash
# Servidor dedicado
cd /opt/inventario-almo
git pull
npm install
cd client && npm run build
sudo su - inventario -c "pm2 restart all"

# Docker
docker-compose down
git pull
docker-compose up -d --build
```

---

## 📋 Estructura de archivos

```
Inventario_Host_dedicado/
├── install_dedicated.sh    # Script de instalación automática
├── deploy.sh               # Script de deploy (servidores existentes)
├── nginx.conf              # Configuración Nginx
├── ecosystem.config.js     # Configuración PM2
├── fix_database.sh        # Script para arreglar BD
├── MANUAL_DE_INSTALACION.md # Manual detallado
└── README.md              # Este archivo
```

---

## ⚠️ Notas Importantes

1. **Certificado SSL:** El script genera un certificado autofirmado. Para producción con dominio real, usa Let's Encrypt:
   ```bash
   sudo certbot --nginx -d tu-dominio.com
   ```

2. **Puerto 80/443:** Asegúrate de que estén abiertos en el firewall:
   ```bash
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw allow 22/tcp
   ```

3. **Base de datos:** En servidor dedicado, la ruta es `/opt/inventario-almo/server/prisma/prisma/dev.db`
