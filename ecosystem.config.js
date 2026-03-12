// ============================================
// PM2 Ecosystem Configuration
// Inventario Almo - Servidor Dedicado
// ============================================

const path = require('path');

const baseDir = path.resolve(__dirname);
const serverDir = path.join(baseDir, 'server');
const clientDir = path.join(baseDir, 'client');

module.exports = {
  apps: [
    {
      name: 'inventario-backend',
      script: './dist/index.js',
      cwd: serverDir,
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '0.0.0.0'
      },
      error_file: '/var/log/inventario/backend-error.log',
      out_file: '/var/log/inventario/backend-out.log',
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
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/inventario/frontend-error.log',
      out_file: '/var/log/inventario/frontend-out.log',
      merge_logs: true
    }
  ]
};
