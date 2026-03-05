# Inventario Almo

Sistema de gestión de inventario para Grupo Almo.

## 🚀 Deploy en Ubuntu 24.04

### Requisitos
- Ubuntu 24.04 Server
- Docker y Docker Compose

### Instalación

```bash
# 1. Conectar al servidor Ubuntu

# 2. Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 3. Cerrar sesión y volver a entrar

# 4. Clonar el proyecto
git clone https://github.com/luiscanel/Inventario-Almo.git
cd Inventario-Almo

# 5. Configurar variables de entorno
cp .env.example .env
nano .env  # Editar con tus valores

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

### 6. Ejecutar
docker-compose up -d --build

# 7. Verificar
docker-compose ps
```

### Acceso
- Frontend: http://tu-servidor:5174
- Backend: http://tu-servidor:3001

### Credenciales
- Usuario: `jorge.canel@grupoalmo.com`
- Contraseña: `admin123`

### Comandos útiles
```bash
# Ver logs
docker-compose logs -f

# Reiniciar
docker-compose restart

# Detener
docker-compose down
```

## ⚠️ IMPORTANTE - Base de Datos

La base de datos está en el volumen Docker: `/app/prisma/dev.db`

**NUNCA ejecutar:**
- `npx prisma generate`
- `npx prisma db push`
- `npx prisma migrate`

Estos comandos borran todos los datos.

## 🛠️ Desarrollo local

```bash
# Instalar dependencias
npm install

# Frontend
cd client && npm run dev

# Backend
cd server && npm run dev
```
