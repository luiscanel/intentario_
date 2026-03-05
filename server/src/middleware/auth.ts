import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { log } from '../utils/logger.js'
import { prisma } from '../prisma/index.js'

// Timeout de inactividad en milisegundos (10 minutos)
const INACTIVITY_TIMEOUT = 10 * 60 * 1000

export interface AuthRequest extends Request {
  user?: {
    id: number
    email: string
    rol: string
    ultimoAccesoActivo?: Date
  }
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
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

    // Verificar timeout por inactividad
    const usuario = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { ultimoAccesoActivo: true, activo: true }
    })

    if (!usuario) {
      log.warn('Auth: User not found', { userId: decoded.id, path: req.path, ip })
      return res.status(401).json({ 
        success: false,
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      })
    }

    if (!usuario.activo) {
      log.warn('Auth: User inactive', { userId: decoded.id, path: req.path, ip })
      return res.status(401).json({ 
        success: false,
        message: 'Usuario inactivo',
        code: 'USER_INACTIVE'
      })
    }

    // Verificar inactividad
    if (usuario.ultimoAccesoActivo) {
      const tiempoInactivo = Date.now() - new Date(usuario.ultimoAccesoActivo).getTime()
      
      if (tiempoInactivo > INACTIVITY_TIMEOUT) {
        log.warn('Auth: Session expired by inactivity', { 
          userId: decoded.id, 
          path: req.path, 
          ip,
          tiempoInactivo: `${Math.round(tiempoInactivo / 60000)} min`
        })
        return res.status(401).json({ 
          success: false,
          message: 'Sesión expirada por inactividad. Por favor, inicie sesión nuevamente.',
          code: 'SESSION_TIMEOUT'
        })
      }
    }

    // Actualizar último acceso activo (de forma asíncrona para no bloquear)
    prisma.user.update({
      where: { id: decoded.id },
      data: { ultimoAccesoActivo: new Date() }
    }).catch(err => log.error('Error updating ultimoAccesoActivo', { error: err.message }))

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
