import { Request, Response, NextFunction } from 'express'

// Middleware para timeout de requests
export function requestTimeout(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set timeout en la respuesta
    res.setTimeout(timeoutMs, () => {
      // Enviar respuesta de timeout
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Request timeout - la operación tardó demasiado',
          code: 'REQUEST_TIMEOUT'
        })
      }
      req.destroy()
    })
    
    next()
  }
}
