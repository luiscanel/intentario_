// ============================================
// PM2 Ecosystem Configuration
// Inventario Almo - Servidor Dedicado
// ============================================
//
// IMPORTANTE: Este archivo detecta automáticamente la ubicación del proyecto.
// En producción, los paths se convierten a absolutos automáticamente.
//
// Puertos:
// - Backend: 3001
// - Frontend: 5174 (debe coincidir con Nginx)
// ============================================

const path = require('path');
const fs = require('fs');

// Detectar automáticamente la ubicación del proyecto
// Buscar desde el directorio actual hacia arriba
let baseDir = __dirname;

// Si estamos en /opt/inventario-almo, usar ese path
// Si no, verificar si existe la estructura del proyecto
if (!fs.existsSync(path.join(baseDir, 'server', 'package.json'))) {
  // Intentar con /opt/inventario-almo
  if (fs.existsSync('/opt/inventario-almo/server/package.json')) {
    baseDir = '/opt/inventario-almo';
  }
}

const serverDir = path.join(baseDir, 'server');
const clientDir = path.join(baseDir, 'client');

module.exports = {
  apps: [
    {
      name: 'inventario-backend',
      script: path.join(serverDir, 'dist/index.js'),
      cwd: serverDir,
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      node_args: '--max-old-space-size=384',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '0.0.0.0'
      },
      error_file: '/var/log/inventario/backend-error.log',
      out_file: '/var/log/inventario/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      wait_ready: true,
      listen_timeout: 5000,
      kill_timeout: 3000
    },
    {
      name: 'inventario-frontend',
      script: 'npm',
      args: 'run preview -- --host 0.0.0.0 --port 5174',
      cwd: clientDir,
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '250M',
      node_args: '--max-old-space-size=192',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/inventario/frontend-error.log',
      out_file: '/var/log/inventario/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
