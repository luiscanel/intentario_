# MANUAL DE INSTALACIÓN
## Inventario Almo - Servidor Dedicado (Sin Docker)

---

## ⚠️ CONFIGURACIÓN DE SEGURIDAD - CORS

**Esta sección es CRÍTICA para producción.**

### ¿Qué es CORS?

CORS (Cross-Origin Resource Sharing) controla qué sitios web pueden acceder a tu API.

| Configuración | Seguridad |
|--------------|-----------|
| `*` (wildcard) | ❌ INSEGURA - Cualquier sitio puede acceder |
| `https://tu-dominio.com` | ✅ SEGURA - Solo tu dominio puede acceder |

### Configuración por Entorno

#### Desarrollo (local)
```bash
# server/.env
CORS_ORIGIN=http://localhost:5174
```

#### Producción (servidor real)
```bash
# server/.env - IMPORTANTE: Usar dominio real, NO *
CORS_ORIGIN=https://inventario.grupoalmo.com
```

### ⚠️ Error Común en Producción

Si en producción pones:
```bash
CORS_ORIGIN=*
```

El servidor **NO ARRANCARÁ** y mostrará:
```
❌ ERROR: CORS_ORIGIN debe definirse con el dominio exacto en producción
```

### Múltiples Dominios

Puedes especificar varios dominios separados por coma:
```bash
CORS_ORIGIN=https://inventario.grupoalmo.com,https://admin.grupoalmo.com
```

---

## Información General

| Campo | Valor |
|-------|-------|
| **Proyecto** | Inventario Almo |
| **Tech Stack** | React + Vite + Express + Prisma + SQLite |
| **Servidor** | Se detecta automáticamente |
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
- Acceso a internet para descargar paquetes

---

## Instalación Automática (Recomendado)

### Paso 1: Conectar al Servidor

```bash
ssh inventario@<IP_DEL_SERVIDOR>
# Ejemplo: ssh inventario@192.168.0.14

sudo su
```

### Paso 2: Clonar y Ejecutar

```bash
# Crear directorio
mkdir -p /opt/inventario-almo
cd /opt/inventario-almo

# Clonar proyecto (necesita token si es repositorio privado)
export GITHUB_TOKEN=tu_token_github
git clone https://github.com/luiscanel/Host_Dedicado.git .

# O sin token si es público:
git clone https://github.com/luiscanel/Host_Dedicado.git .

# Dar permisos y ejecutar
chmod +x deploy.sh
./deploy.sh
```

### Paso 3: Verificar Instalación

```bash
# Ver IP del servidor
hostname -I

# Ver servicios
pm2 status

# Probar API
curl http://localhost:3001/api/health
```

---

## Resultado de Instalación

| Servicio | URL |
|----------|-----|
| Frontend | http://<IP_SERVIDOR> |
| Backend API | http://<IP_SERVIDOR>:3001 |

### Credenciales de Acceso

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
```

### Reiniciar Servicios

```bash
pm2 restart all
```

### Detener Servicios

```bash
pm2 stop all
```

---

## Estructura de Archivos

```
/opt/inventario-almo/
├── client/                    # Frontend (React + Vite)
│   ├── dist/                 # Build de producción
│   ├── src/
│   ├── package.json
│   ├── .env
│   └── vite.config.ts
├── server/                    # Backend (Express)
│   ├── src/
│   ├── prisma/
│   │   ├── dev.db            # Base de datos SQLite
│   │   └── schema.prisma
│   ├── package.json
│   └── .env
├── backups/                   # Backups de la base de datos
├── nginx.conf                # Configuración de Nginx
├── ecosystem.config.js       # Configuración de PM2
├── deploy.sh                 # Script de instalación automática
└── MANUAL_DE_INSTALACION.md
```

---

## Backups

### Crear Backup

```bash
cd /opt/inventario-almo/server/prisma
cp dev.db ../../backups/inventario_$(date +%Y%m%d_%H%M%S).db
```

### Restaurar Backup

```bash
pm2 stop all
cp /opt/inventario-almo/backups/inventario_20240101_120000.db /opt/inventario-almo/server/prisma/dev.db
pm2 start all
```

---

## Errores Comunes

### 1. Error: Cannot find module 'tsx'

```bash
cd /opt/inventario-almo/server
npm install --save-dev tsx
```

### 2. Error: Cannot find module '@prisma/client'

```bash
cd /opt/inventario-almo/server
npx prisma generate
```

### 3. Error: Puerto en uso

```bash
sudo lsof -i :3001
sudo lsof -i :80
sudo kill -9 <PID>
```

### 4. No puedo iniciar sesión (base de datos vacía)

Ejecutar script de creación de admin manualmente:

```bash
cd /opt/inventario-almo/server
node create_admin.js
```

---

## Actualización

```bash
cd /opt/inventario-almo
git pull origin master
pm2 restart all
```

---

## Notas

1. **IP del servidor**: Se detecta automáticamente con `hostname -I`
2. **Base de datos**: SQLite en `/opt/inventario-almo/server/prisma/dev.db`
3. **Logs**: `/var/log/inventario-almo/`

---

*Documento generado para Inventario Almo - Versión 1.1*
*Fecha: 28 de febrero de 2026*
