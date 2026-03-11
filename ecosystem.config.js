// ============================================
// PM2 Ecosystem Configuration
// Inventario Almo - Servidor Dedicado
// ============================================
//
// IMPORTANTE: Este archivo se usa tanto para desarrollo local como para producción.
// En producción, los paths se convierten a absolutos automáticamente.
//
// Puertos:
// - Backend: 3001
// - Frontend: 5174 (debe coincidir con Nginx)
// ============================================

const path = require('path');

// Detectar si es producción (servidor dedicado)
const isProduction = process.env.PM2_HOME || process.env.NODE_ENV === 'production';

// Rutas absolutas para producción
const baseDir = isProduction ? '/opt/inventario-almo' : path.join(__dirname);
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
      merge_logs: true
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
