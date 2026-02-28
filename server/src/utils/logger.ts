import winston from 'winston'
import path from 'path'
import fs from 'fs'

// Directorio de logs
const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs')

// Crear directorio si no existe
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

// Formato de logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`
    
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`
    }
    return msg
  })
)

// Formato para desarrollo
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} ${level}: ${message}`
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`
    }
    return msg
  })
)

// Configuración de transports
const transports: winston.transport[] = [
  // Console en desarrollo
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' 
      ? logFormat 
      : devFormat
  }),
  
  // Archivo de errores
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    maxsize: 5 * 1024 * 1024, // 5MB
    maxFiles: 5,
    format: logFormat
  }),
  
  // Archivo de logs general
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 7,
    format: logFormat
  })
]

// Crear logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false
})

// Helper functions
export const log = {
  info: (message: string, meta?: any) => logger.info(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  error: (message: string, meta?: any) => logger.error(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),
  
  // Logs específicos
  http: (message: string, meta?: any) => logger.http(message, meta),
  
  // Auth logs
  auth: {
    login: (email: string, success: boolean, ip: string) => {
      logger.info(`Login attempt: ${success ? 'SUCCESS' : 'FAILED'}`, { 
        email, 
        ip, 
        action: 'LOGIN' 
      })
    },
    logout: (userId: number, ip: string) => {
      logger.info('User logout', { userId, ip, action: 'LOGOUT' })
    },
    tokenRefresh: (userId: number, success: boolean) => {
      logger.info(`Token refresh: ${success ? 'SUCCESS' : 'FAILED'}`, { 
        userId, 
        action: 'TOKEN_REFRESH' 
      })
    }
  },
  
  // API logs
  api: {
    request: (method: string, path: string, userId?: number, duration?: number) => {
      logger.http(`${method} ${path}`, { userId, duration, action: 'REQUEST' })
    },
    response: (method: string, path: string, statusCode: number, duration: number) => {
      logger.http(`${method} ${path} ${statusCode}`, { statusCode, duration, action: 'RESPONSE' })
    }
  },
  
  // Database logs
  db: {
    query: (operation: string, duration: number, success: boolean) => {
      logger.debug(`DB ${operation}`, { duration, success, action: 'DB_QUERY' })
    },
    error: (operation: string, error: string) => {
      logger.error(`DB Error: ${operation}`, { error, action: 'DB_ERROR' })
    }
  }
}

export default logger
