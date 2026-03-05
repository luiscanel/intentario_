"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsOptions = exports.authRateLimiter = exports.generalRateLimiter = exports.helmetMiddleware = void 0;
exports.errorHandler = errorHandler;
exports.requestLogger = requestLogger;
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const index_js_1 = require("../config/index.js");
const logger_js_1 = require("../utils/logger.js");
// ============================================
// HELMET - Headers de seguridad
// ============================================
exports.helmetMiddleware = (0, helmet_1.default)({
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
});
// ============================================
// RATE LIMITING - General
// ============================================
exports.generalRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: index_js_1.securityConfig.rateLimit.windowMs,
    max: index_js_1.securityConfig.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Demasiadas solicitudes, por favor intente más tarde.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    skip: (req) => {
        return req.path === '/api/health';
    }
});
// ============================================
// RATE LIMITING - Autenticación (más estricto)
// ============================================
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: index_js_1.securityConfig.authRateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Demasiados intentos de inicio de sesión. Intente en 15 minutos.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
    },
    skip: (req) => {
        // Skip: false = aplicar rate limit, true = no aplicar
        // Se aplica solo a rutas de login dentro de /api/auth
        return !req.path.includes('/auth/login');
    }
});
// ============================================
// CORS - Configuración
// ============================================
exports.corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = index_js_1.securityConfig.corsOrigin.split(',').map(o => o.trim());
        // En desarrollo, permitir sin origin header
        if (!origin) {
            if (index_js_1.securityConfig.isProduction) {
                return callback(new Error('CORS: No origin provided'), false);
            }
            return callback(null, true);
        }
        // Verificar si el origin está permitido
        if (allowedOrigins.includes('*')) {
            // En producción, no permitir wildcard
            if (index_js_1.securityConfig.isProduction) {
                return callback(new Error('CORS: Wildcard not allowed in production'), false);
            }
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('CORS: Origin not allowed'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 86400,
};
function errorHandler(err, req, res, next) {
    // Log del error
    if (index_js_1.securityConfig.isProduction) {
        logger_js_1.log.error(err.message, {
            path: req.path,
            method: req.method,
            stack: err.stack
        });
    }
    else {
        logger_js_1.log.error(err.message, {
            path: req.path,
            method: req.method,
            stack: err.stack
        });
    }
    // Errores conocidos
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Datos de entrada inválidos',
            code: 'VALIDATION_ERROR'
        });
    }
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            message: 'No autorizado',
            code: 'UNAUTHORIZED'
        });
    }
    // Respuesta genérica en producción
    res.status(500).json({
        success: false,
        message: index_js_1.securityConfig.isProduction
            ? 'Error interno del servidor'
            : err.message,
        code: 'INTERNAL_ERROR'
    });
}
// ============================================
// REQUEST LOGGING - Logging de requests
// ============================================
function requestLogger(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.get('user-agent')?.substring(0, 50) || 'unknown';
        // Loguear errores o requests lentos
        if (res.statusCode >= 400) {
            logger_js_1.log.warn('Request error', {
                method: req.method,
                path: req.path,
                status: res.statusCode,
                duration: `${duration}ms`,
                ip,
                userAgent
            });
        }
        else if (duration > 1000) {
            logger_js_1.log.warn('Slow request', {
                method: req.method,
                path: req.path,
                duration: `${duration}ms`,
                ip
            });
        }
    });
    next();
}
