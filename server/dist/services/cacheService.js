"use strict";
// Servicio de cache en memoria para respuestas de API
// Útil para dashboards que se consultan frecuentemente
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = void 0;
exports.cacheMiddleware = cacheMiddleware;
exports.invalidateCache = invalidateCache;
class MemoryCache {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 5 * 60 * 1000; // 5 minutos por defecto
    }
    set(key, data, ttl) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL
        });
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        // Verificar si expiró
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    has(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return false;
        // Verificar si expiró
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }
    delete(key) {
        this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
    // Eliminar entradas que coincidan con un patrón
    invalidatePattern(pattern) {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }
    // Obtener estadísticas del cache
    getStats() {
        let expired = 0;
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                expired++;
            }
        }
        return {
            total: this.cache.size,
            expired,
            active: this.cache.size - expired
        };
    }
}
exports.cacheService = new MemoryCache();
// Middleware para cachear respuestas
function cacheMiddleware(ttl = 5 * 60 * 1000) {
    return (req, res, next) => {
        // Solo cachear GET requests
        if (req.method !== 'GET') {
            return next();
        }
        const cacheKey = req.originalUrl || req.url;
        // Verificar si hay datos en cache
        const cachedData = exports.cacheService.get(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }
        // Interceptar json() para guardar en cache
        const originalJson = res.json.bind(res);
        res.json = (data) => {
            // Solo cachear respuestas exitosas
            if (res.statusCode >= 200 && res.statusCode < 300) {
                exports.cacheService.set(cacheKey, data, ttl);
            }
            return originalJson(data);
        };
        next();
    };
}
// Helper para invalidar cache después de modificaciones
function invalidateCache(pattern) {
    if (pattern) {
        exports.cacheService.invalidatePattern(pattern);
    }
    else {
        exports.cacheService.clear();
    }
}
