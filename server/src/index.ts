import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'
import servidoresRoutes from './routes/servidores'
import inventarioFisicoRoutes from './routes/inventarioFisico'
import inventarioCloudRoutes from './routes/inventarioCloud'
import dashboardRoutes from './routes/dashboard'
import dashboardNewRoutes from './routes/dashboardNew'
import adminRoutes from './routes/admin'
import emailRoutes from './routes/email'
import backupRoutes from './routes/backup'

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
app.listen(PORT, HOST, () => {
  log.info(`Inventario Almo iniciado`, {
    environment: config.NODE_ENV,
    port: PORT,
    host: HOST,
    rateLimit: `${config.RATE_LIMIT_MAX_REQUESTS} req/${config.RATE_LIMIT_WINDOW_MS}`
  })
})
