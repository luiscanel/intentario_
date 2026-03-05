// ============================================
// PM2 Ecosystem Configuration
// Inventario Almo - Servidor Dedicado
// ============================================

module.exports = {
  apps: [
    {
      name: 'inventario-backend',
      script: 'npx',
      args: 'tsx src/index.ts',
      cwd: '/opt/inventario-almo/server',
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
      script: 'npm',
      args: 'run preview -- --host 0.0.0.0 --port 5173',
      cwd: '/opt/inventario-almo/client',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        VITE_API_URL: 'http://localhost:3001'
      },
      error_file: '/var/log/inventario/frontend-error.log',
      out_file: '/var/log/inventario/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
}
