import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import compression from 'compression'
import http from 'http'
import authRoutes from './routes/auth'
import servidoresRoutes from './routes/servidores'
import inventarioFisicoRoutes from './routes/inventarioFisico'
import inventarioCloudRoutes from './routes/inventarioCloud'
import dashboardRoutes from './routes/dashboard'
import dashboardNewRoutes from './routes/dashboardNew'
import adminRoutes from './routes/admin'
import emailRoutes from './routes/email'
import backupRoutes from './routes/backup'
import proveedoresRoutes from './routes/proveedores'
import licenciasRoutes from './routes/licencias'
import contratosRoutes from './routes/contratos'
import alertasRoutes from './routes/alertas'
import monitorRoutes from './routes/monitor'
import documentosRoutes from './routes/documentos'

// Nuevas rutas de módulos
import certificadosRoutes from './routes/nuevos/certificados'
import cambiosRoutes from './routes/nuevos/cambios'
import backupsProgramadosRoutes from './routes/nuevos/backups'
import costosRoutes from './routes/nuevos/costos'
import serviciosRoutes from './routes/nuevos/monitor'

// Importar configuración y seguridad
import { config } from './config/index.js'
import { log } from './utils/logger.js'
import { 
  helmetMiddleware, 
  generalRateLimiter, 
  authRateLimiter,
  corsOptions,
  errorHandler,
  requestLogger
} from './middleware/security.js'

// Importar servicio de notificaciones
import { startNotificationService } from './services/notificacionesService.js'
import { cacheService } from './services/cacheService.js'
import { requestTimeout } from './middleware/timeout.js'

// Cargar variables de entorno
dotenv.config()

const app = express()
const PORT = parseInt(config.PORT)
const HOST = config.HOST

// ============================================
// MIDDLEWARE DE SEGURIDAD
// ============================================

// Helmet - Headers de seguridad
app.use(helmetMiddleware)

// Rate limiting general (100 requests / 15 min)
app.use(generalRateLimiter)

// Rate limiting específico para auth (5 attempts / 15 min)
app.use('/api/auth', authRateLimiter)

// CORS configurado
app.use(cors(corsOptions))

// Parser JSON con límite de tamaño (10MB para importaciones grandes)
app.use(express.json({ limit: '10mb' }))

// Parser para form data
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Compresión gzip para respuestas
app.use(compression({
  threshold: 1024,
  level: 6,
}))

// Archivos estáticos (uploads) - con restricciones de seguridad
app.use('/uploads', (req, res, next) => {
  // Restringir MIME types permitidos
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'text/plain'
  ]
  
  const fileExt = req.path.split('.').pop()?.toLowerCase()
  const allowedExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'txt']
  
  // Solo permitir extensiones conocidas
  if (fileExt && !allowedExts.includes(fileExt)) {
    return res.status(403).json({ success: false, message: 'Tipo de archivo no permitido' })
  }
  
  next()
}, express.static(path.join(process.cwd(), 'uploads'), {
  maxAge: '1h',
  dotfiles: 'ignore',
  etag: true,
  extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'txt']
}))

// Logging de requests
app.use(requestLogger)

// ============================================
// RUTAS
// ============================================

// Rutas públicas (auth tiene rate limiting específico)
app.use('/api/auth', authRoutes)

// Rutas de dashboards (protegidas)
app.use('/api/dashboard', dashboardNewRoutes)
app.use('/api/dashboard', dashboardRoutes)

// Rutas protegidas
app.use('/api/servidores', servidoresRoutes)
app.use('/api/inventario-fisico', inventarioFisicoRoutes)
app.use('/api/inventario-cloud', inventarioCloudRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/email', emailRoutes)
app.use('/api/backup', backupRoutes)

// Nuevas rutas
app.use('/api/proveedores', proveedoresRoutes)
app.use('/api/licencias', licenciasRoutes)
app.use('/api/contratos', contratosRoutes)
app.use('/api/alertas', alertasRoutes)
app.use('/api/monitor', monitorRoutes)
app.use('/api/documentos', documentosRoutes)

// Nuevos módulos
app.use('/api/certificados', certificadosRoutes)
app.use('/api/cambios', cambiosRoutes)
app.use('/api/backups-programados', backupsProgramadosRoutes)
app.use('/api/costos', costosRoutes)
app.use('/api/servicios', serviciosRoutes)

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV
  })
})

// ============================================
// ERROR HANDLER
// ============================================
app.use(errorHandler)

// ============================================
// INICIO DEL SERVIDOR
// ============================================
const server = app.listen(PORT, HOST, () => {
  log.info(`Inventario Almo iniciado`, {
    environment: config.NODE_ENV,
    port: PORT,
    host: HOST,
    rateLimit: `${config.RATE_LIMIT_MAX_REQUESTS} req/${config.RATE_LIMIT_WINDOW_MS}`
  })
  
  // Iniciar servicio de notificaciones programadas (solo en producción o si está habilitado)
  if (config.NODE_ENV === 'production' || process.env.ENABLE_NOTIFICATIONS === 'true') {
    startNotificationService()
  }
})

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
function gracefulShutdown(signal: string) {
  log.info(`Recibida señal ${signal}. Cerrando servidor...`)
  
  server.close((err) => {
    if (err) {
      log.error('Error al cerrar servidor', { error: err.message })
      process.exit(1)
    }
    
    log.info('Servidor cerrado correctamente')
    
    // Cerrar conexiones de BD
    import('./prisma/index.js').then(({ prisma }) => {
      prisma.$disconnect()
        .then(() => {
          log.info('Conexiones de BD cerradas')
          process.exit(0)
        })
        .catch((e) => {
          log.error('Error al cerrar BD', { error: e })
          process.exit(1)
        })
    })
  })
  
  // Force close después de 30 segundos
  setTimeout(() => {
    log.error('Forzando cierre después de 30 segundos')
    process.exit(1)
  }, 30000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
