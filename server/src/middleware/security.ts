import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { securityConfig, config } from '../config/index.js'
import { log } from '../utils/logger.js'

// ============================================
// HELMET - Headers de seguridad
// ============================================
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
})

// ============================================
// RATE LIMITING - General
// ============================================
export const generalRateLimiter = rateLimit({
  windowMs: securityConfig.rateLimit.windowMs,
  max: securityConfig.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes, por favor intente más tarde.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  skip: (req) => {
    return req.path === '/api/health'
  }
})

// ============================================
// RATE LIMITING - Autenticación (más estricto)
// ============================================
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: securityConfig.authRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión. Intente en 15 minutos.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  skip: (req) => {
    return !req.path.includes('/auth/login')
  }
})

// ============================================
// CORS - Configuración
// ============================================
export const corsOptions = {
  origin: securityConfig.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400,
}

// ============================================
// ERROR HANDLER - Manejo de errores centralizado
// ============================================
import { Request, Response, NextFunction } from 'express'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log del error
  if (securityConfig.isProduction) {
    log.error(err.message, { 
      path: req.path, 
      method: req.method,
      stack: err.stack 
    })
  } else {
    log.error(err.message, { 
      path: req.path, 
      method: req.method,
      stack: err.stack 
    })
  }

  // Errores conocidos
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      code: 'VALIDATION_ERROR'
    })
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'No autorizado',
      code: 'UNAUTHORIZED'
    })
  }

  // Respuesta genérica en producción
  res.status(500).json({
    success: false,
    message: securityConfig.isProduction 
      ? 'Error interno del servidor' 
      : err.message,
    code: 'INTERNAL_ERROR'
  })
}

// ============================================
// REQUEST LOGGING - Logging de requests
// ============================================
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    const userAgent = req.get('user-agent')?.substring(0, 50) || 'unknown'
    
    // Loguear errores o requests lentos
    if (res.statusCode >= 400) {
      log.warn('Request error', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip,
        userAgent
      })
    } else if (duration > 1000) {
      log.warn('Slow request', {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        ip
      })
    }
  })
  
  next()
}
