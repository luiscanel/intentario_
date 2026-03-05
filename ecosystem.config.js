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

module.exports = {
  apps: [
    {
      name: 'inventario-backend',
      script: 'npx',
      args: 'tsx src/index.ts',
      cwd: './server',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
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
      script: 'npx',
      args: 'vite preview --host 0.0.0.0 --port 5174',
      cwd: './client',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
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
