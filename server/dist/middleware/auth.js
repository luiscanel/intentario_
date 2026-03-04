"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requireAdmin = requireAdmin;
exports.optionalAuth = optionalAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = require("../config/index.js");
const logger_js_1 = require("../utils/logger.js");
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger_js_1.log.warn('Auth: No token provided', { path: req.path, ip });
        return res.status(401).json({
            success: false,
            message: 'No autorizado',
            code: 'NO_TOKEN'
        });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, index_js_1.config.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            logger_js_1.log.warn('Auth: Token expired', { path: req.path, ip });
            return res.status(401).json({
                success: false,
                message: 'Token expirado',
                code: 'TOKEN_EXPIRED'
            });
        }
        logger_js_1.log.warn('Auth: Invalid token', { path: req.path, ip });
        return res.status(401).json({
            success: false,
            message: 'Token inválido',
            code: 'INVALID_TOKEN'
        });
    }
}
function requireAdmin(req, res, next) {
    if (req.user?.rol !== 'admin') {
        logger_js_1.log.warn('Auth: Admin access denied', {
            userId: req.user?.id,
            userRole: req.user?.rol,
            path: req.path
        });
        return res.status(403).json({
            success: false,
            message: 'Acceso denegado. Se requiere rol de administrador.',
            code: 'FORBIDDEN'
        });
    }
    next();
}
// Middleware opcional que no bloquea si no hay token
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, index_js_1.config.JWT_SECRET);
        req.user = decoded;
    }
    catch {
        // Ignorar errores de token en auth opcional
    }
    next();
}
