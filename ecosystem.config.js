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
      }
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
      }
    }
  ]
}
