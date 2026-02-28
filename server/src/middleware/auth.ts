import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { log } from '../utils/logger.js'

export interface AuthRequest extends Request {
  user?: {
    id: number
    email: string
    rol: string
  }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const ip = req.ip || req.socket.remoteAddress || 'unknown'

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    log.warn('Auth: No token provided', { path: req.path, ip })
    return res.status(401).json({ 
      success: false,
      message: 'No autorizado',
      code: 'NO_TOKEN'
    })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { id: number; email: string; rol: string }
    req.user = decoded
    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      log.warn('Auth: Token expired', { path: req.path, ip })
      return res.status(401).json({ 
        success: false,
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      })
    }
    log.warn('Auth: Invalid token', { path: req.path, ip })
    return res.status(401).json({ 
      success: false,
      message: 'Token inválido',
      code: 'INVALID_TOKEN'
    })
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.rol !== 'admin') {
    log.warn('Auth: Admin access denied', { 
      userId: req.user?.id, 
      userRole: req.user?.rol,
      path: req.path 
    })
    return res.status(403).json({ 
      success: false,
      message: 'Acceso denegado. Se requiere rol de administrador.',
      code: 'FORBIDDEN'
    })
  }
  next()
}

// Middleware opcional que no bloquea si no hay token
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next()
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { id: number; email: string; rol: string }
    req.user = decoded
  } catch {
    // Ignorar errores de token en auth opcional
  }

  next()
}
