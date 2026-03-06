import { Request, Response, NextFunction, RequestHandler } from 'express'
import { log } from '../utils/logger.js'

// ============================================
// TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  code?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ApiError {
  success: false
  message: string
  code: string
  details?: any
}

// ============================================
// SUCCESS RESPONSES
// ============================================

export function success<T>(data: T, message = 'Operación exitosa'): ApiResponse<T> {
  return { success: true, data, message }
}

export function created<T>(data: T, message = 'Recurso creado'): ApiResponse<T> {
  return { success: true, data, message }
}

export function updated<T>(data: T, message = 'Recurso actualizado'): ApiResponse<T> {
  return { success: true, data, message }
}

export function deleted(message = 'Recurso eliminado'): ApiResponse {
  return { success: true, message }
}

export function withPagination<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): ApiResponse<T[]> {
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

// ============================================
// ERROR RESPONSES
// ============================================

export function badRequest(message = 'Solicitud inválida', code = 'BAD_REQUEST', details?: any): ApiError {
  return { success: false, message, code, details }
}

export function unauthorized(message = 'No autorizado', code = 'UNAUTHORIZED'): ApiError {
  return { success: false, message, code }
}

export function forbidden(message = 'Acceso denegado', code = 'FORBIDDEN'): ApiError {
  return { success: false, message, code }
}

export function notFound(message = 'Recurso no encontrado', code = 'NOT_FOUND'): ApiError {
  return { success: false, message, code }
}

export function conflict(message = 'Conflicto de datos', code = 'CONFLICT'): ApiError {
  return { success: false, message, code }
}

export function serverError(message = 'Error del servidor', code = 'SERVER_ERROR', details?: any): ApiError {
  return { success: false, message, code, details }
}

// ============================================
// WRAPPER FOR ROUTE HANDLERS
// ============================================

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// ============================================
// INPUT SANITIZATION MIDDLEWARE
// ============================================

/**
 * Sanitiza inputs para prevenir SQL Injection y XSS
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remover caracteres peligrosos para SQL
      let sanitized = value
        .replace(/'/g, '')
        .replace(/"/g, '')
        .replace(/;/g, '')
        .replace(/--/g, '')
        .replace(/\/\*/g, '')
        .replace(/\*\//g, '')
        .replace(/xp_/gi, '')
        .replace(/sp_/gi, '')
        .replace(/exec/gi, '')
        .replace(/execute/gi, '')
      
      // Remover tags HTML básicos para XSS
      sanitized = sanitized
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
      
      return sanitized.trim()
    }
    
    if (Array.isArray(value)) {
      return value.map(sanitizeValue)
    }
    
    if (value && typeof value === 'object') {
      const sanitized: any = {}
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeValue(val)
      }
      return sanitized
    }
    
    return value
  }

  // Sanitizar body, query y params
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body)
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query)
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params)
  }

  next()
}

// ============================================
// VALIDATION ERROR HANDLER
// ============================================

export function handleZodError(error: any): ApiError {
  if (error.name === 'ZodError') {
    const issues = error.issues.map((issue: any) => ({
      field: issue.path.join('.'),
      message: issue.message
    }))
    return {
      success: false,
      message: 'Error de validación',
      code: 'VALIDATION_ERROR',
      details: issues
    }
  }
  return serverError('Error de validación')
}

// ============================================
// ID PARAM VALIDATOR
// ============================================

export function validateIdParam(paramName = 'id'): RequestHandler {
  return (req, res, next) => {
    const id = req.params[paramName]
    const parsedId = parseInt(id)
    
    if (isNaN(parsedId) || parsedId <= 0) {
      return res.status(400).json(badRequest(`ID inválido: ${id}`, 'INVALID_ID'))
    }
    
    req.params[paramName] = parsedId.toString()
    next()
  }
}

// ============================================
// PAGINATION HELPER
// ============================================

export function parsePagination(req: Request): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50))
  const skip = (page - 1) * limit
  
  return { page, limit, skip }
}

// ============================================
// QUERY BUILDER HELPER
// ============================================

export interface WhereClause {
  [key: string]: any
}

export function buildWhereClause(filters: Record<string, any>): WhereClause {
  const where: WhereClause = {}
  
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      if (key === 'buscar') {
        // Búsqueda textual en múltiples campos
        where.OR = [
          { nombre: { contains: value } },
          { descripcion: { contains: value } },
          { titulo: { contains: value } },
          { email: { contains: value } }
        ].filter(f => f)
      } else if (typeof value === 'string' && value.includes(',')) {
        // Filtrar por múltiples valores
        where[key] = { in: value.split(',') }
      } else {
        where[key] = value
      }
    }
  }
  
  return where
}
