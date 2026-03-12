# Inventario Almo - Documentación del Proyecto

## Información General

- **Nombre:** Inventario Almo
- **Tipo:** Aplicación fullstack (React + Node.js/Express + SQLite/Prisma)
- **Repositorio:** https://github.com/luiscanel/intentario_.git
- **Estado:** En producción

## Estructura del Proyecto

```
inventario-almo/
├── client/                 # Frontend (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/    # Componentes reutilizables
│   │   ├── pages/         # Páginas de la aplicación
│   │   ├── lib/          # Utilidades (API, etc.)
│   │   └── types/         # Tipos TypeScript
│   └── dist/              # Build de producción
├── server/                 # Backend (Express + Prisma)
│   ├── src/
│   │   ├── routes/       # Endpoints de API
│   │   ├── services/     # Lógica de negocio
│   │   ├── middleware/   # Middleware de seguridad
│   │   └── prisma/       # Schema de base de datos
│   └── dist/              # Build compilado
├── ecosystem.config.js    # Configuración PM2
└── package.json           # Workspaces config
```

## Configuración de Puertos

| Servicio | Puerto |
|----------|--------|
| Backend  | 3001   |
| Frontend | 5174   |

## Credenciales

- **Usuario admin:** jorge.canel@grupoalmo.com
- **Password:** admin123
- **Dominio requerido:** @grupoalmo.com

## Servidores

### Servidor de Producción
- **IP:** 192.168.0.8
- **Usuario:** inventario
- **Ruta:** /opt/inventario-almo
- **Base de datos:** /opt/inventario-almo/server/prisma/prisma/dev.db

## Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo (ambos servicios)
npm run dev

# Solo backend
npm run dev:server

# Solo frontend
npm run dev:client

# Build producción
npm run build

# Compilar backend
cd server && npm run build

# Compilar frontend
cd client && npm run build
```

## Comandos de Producción (Servidor)

```bash
# Ver estado de servicios
pm2 status

# Reiniciar servicios
pm2 restart inventario-backend inventario-frontend

# Ver logs
pm2 logs inventario-backend

# Ver logs en tiempo real
pm2 logs inventario-backend --f

# Guardar configuración PM2
pm2 save

# Verificar que el backend responde
curl http://localhost:3001/api/health
```

## Actualizar en Producción

```bash
cd /opt/inventario-almo

# 1. Bajar cambios
git pull

# 2. Compilar frontend
cd client && npm run build

# 3. Compilar backend
cd ../server && npm run build

# 4. Sincronizar BD (si hay cambios)
npx prisma db push

# 5. Reiniciar servicios
pm2 restart inventario-backend inventario-frontend
pm2 save
```

## Notas Importantes

### Issues Conocidos

1. **PM2 no detecta PID del backend** - El proceso funciona pero PM2 muestra "N/A" en el PID. No afecta el funcionamiento.

2. **El archivo update.sh fue eliminado** - Ya no se usa, se hace manualmente.

### Características del Proyecto

- Autenticación con cookies (no localStorage)
- Rate limiting configurado
- Base de datos SQLite con Prisma
- Módulos: Dashboard, Inventario (servidores, cloud, físico), Monitor, Proveedores, Licencias, Contratos, Alertas, Seguridad, Recursos, Disponibilidad, Responsables, Informes, Admin, Audit Log

### Roles del Sistema

- **admin:** Acceso completo
- **usuario:** Solo lectura
- **tecnico:** Acceso a inventario y monitor

## Pendientes / En Desarrollo

1. [ ] Implementar botón de actualización desde el frontend
2. [ ] Mejorar logs de actualización en producción

## Git - Cómo Funciona

### ¿Por qué el servidor puede hacer git pull?

```
Tu PC local (desarrollo)     GitHub                  Servidor producción
       │                         │                          │
       │  git push               │                          │
       ├──────────────────────►  │                          │
       │                         │  git pull (descarga)     │
       │                         │◄─────────────────────────┤
       │                         │                          │
       │                         │    El servidor descarga  │
       │                         │    los cambios de GitHub │
       │                         │                          │
```

- **GitHub es público** - Cualquier servidor con internet puede descargar código
- **Las credenciales están guardadas** en el servidor
- **HTTPS o SSH** - El servidor se autentica con GitHub

### Verificar configuración en servidor:
```bash
cd /opt/inventario-almo
git remote -v           # Ver origen
git ls-remote origin    # Probar conexión
git status              # Ver estado actual
```

### Revertir cambios si algo falla:
```bash
git revert HEAD         # Crear commit que deshace cambios
git reset --hard HEAD~1 # Volver al commit anterior (peligroso)
```

## Ideas para Futuro

### 1. Botón de Actualización en Admin
- Endpoint en backend que ejecute git pull + build
- Mostrar log en tiempo real en el frontend
- Solo usuarios admin pueden ejecutar

### 2. Webhook de GitHub
- GitHub avisa al servidor cuando hay push
- Actualización automática

### 3. Script de Actualización Mejorado
- Con verificación de cambios antes de hacer pull
- Con rollback automático si falla
- Con notificaciones por email

## Contraseñas y Secrets (NO subir a GitHub)

- JWT_SECRET en .env
- Credenciales de base de datos
- Tokens de API

## Troubleshooting Común

### El backend no inicia
```bash
# Ver logs de error
pm2 logs inventario-backend --err

# Ejecutar manualmente para ver errores
cd /opt/inventario-almo/server
node dist/index.js
```

### Error de base de datos
```bash
# Verificar que la BD existe
ls -la /opt/inventario-almo/server/prisma/prisma/

# Verificar contenido del .env
cat /opt/inventario-almo/server/.env
```

### Puerto en uso
```bash
# Ver qué usa el puerto
lsof -i :3001
lsof -i :5174

# Matar proceso
kill <PID>
```

### PM2 no detecta el PID
- El proceso funciona aunque muestre "N/A"
- Verificar con: curl http://localhost:3001/api/health

## Archivos Ignorados (.gitignore)

```
node_modules/
dist/
.env
*.log
*.db
```

## Variables de Entorno Requeridas

### server/.env
```
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
JWT_SECRET=<clave-segura-min-32-caracteres>
JWT_EXPIRES_IN=24h
DATABASE_URL=file:/opt/inventario-almo/server/prisma/prisma/dev.db
CORS_ORIGIN=https://tu-dominio.com
RATE_LIMIT_WINDOW_MS=15 minutes
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
```

## API Endpoints

### Autenticación
- POST /api/auth/login - Iniciar sesión
- POST /api/auth/logout - Cerrar sesión
- GET /api/auth/me - Obtener usuario actual

### Dashboard
- GET /api/dashboard/resumen - Resumen general
- GET /api/dashboard/estadisticas - Estadísticas

### Inventario
- GET/POST /api/servidores - Servidores
- GET/POST /api/inventario-cloud - Servicios cloud
- GET/POST /api/inventario-fisico - Equipos físicos

### Administración
- GET/POST /api/admin/usuarios - Gestión de usuarios
- GET /api/admin/roles - Roles y permisos

---

*Documentación local - NO subir a GitHub*
*Documentación creada: 2026-03-12*
*Última actualización: 2026-03-12*
