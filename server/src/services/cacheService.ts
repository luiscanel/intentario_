// Servicio de cache en memoria para respuestas de API
// Útil para dashboards que se consultan frecuentemente

interface CacheEntry {
  data: any
  timestamp: number
  ttl: number // Time to live en ms
}

class MemoryCache {
  private cache: Map<string, CacheEntry> = new Map()
  private defaultTTL: number = 5 * 60 * 1000 // 5 minutos por defecto

  set(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    })
  }

  get(key: string): any | null {
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    // Verificar si expiró
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    // Verificar si expiró
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Eliminar entradas que coincidan con un patrón
  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  // Obtener estadísticas del cache
  getStats() {
    let expired = 0
    const now = Date.now()
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expired++
      }
    }
    
    return {
      total: this.cache.size,
      expired,
      active: this.cache.size - expired
    }
  }
}

export const cacheService = new MemoryCache()

// Middleware para cachear respuestas
export function cacheMiddleware(ttl: number = 5 * 60 * 1000) {
  return (req: any, res: any, next: any) => {
    // Solo cachear GET requests
    if (req.method !== 'GET') {
      return next()
    }

    const cacheKey = req.originalUrl || req.url

    // Verificar si hay datos en cache
    const cachedData = cacheService.get(cacheKey)
    
    if (cachedData) {
      return res.json(cachedData)
    }

    // Interceptar json() para guardar en cache
    const originalJson = res.json.bind(res)
    
    res.json = (data: any) => {
      // Solo cachear respuestas exitosas
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheService.set(cacheKey, data, ttl)
      }
      return originalJson(data)
    }

    next()
  }
}

// Helper para invalidar cache después de modificaciones
export function invalidateCache(pattern?: string) {
  if (pattern) {
    cacheService.invalidatePattern(pattern)
  } else {
    cacheService.clear()
  }
}
