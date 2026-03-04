"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Directorio de logs
const logDir = process.env.LOG_DIR || path_1.default.join(process.cwd(), 'logs');
// Crear directorio si no existe
if (!fs_1.default.existsSync(logDir)) {
    fs_1.default.mkdirSync(logDir, { recursive: true });
}
// Formato de logs
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
}));
// Formato para desarrollo
const devFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'HH:mm:ss' }), winston_1.default.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} ${level}: ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
}));
// Configuración de transports
const transports = [
    // Console en desarrollo
    new winston_1.default.transports.Console({
        format: process.env.NODE_ENV === 'production'
            ? logFormat
            : devFormat
    }),
    // Archivo de errores
    new winston_1.default.transports.File({
        filename: path_1.default.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 5 * 1024 * 1024, // 5MB
        maxFiles: 5,
        format: logFormat
    }),
    // Archivo de logs general
    new winston_1.default.transports.File({
        filename: path_1.default.join(logDir, 'combined.log'),
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 7,
        format: logFormat
    })
];
// Crear logger
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports,
    exitOnError: false
});
// Helper functions
exports.log = {
    info: (message, meta) => exports.logger.info(message, meta),
    warn: (message, meta) => exports.logger.warn(message, meta),
    error: (message, meta) => exports.logger.error(message, meta),
    debug: (message, meta) => exports.logger.debug(message, meta),
    // Logs específicos
    http: (message, meta) => exports.logger.http(message, meta),
    // Auth logs
    auth: {
        login: (email, success, ip) => {
            exports.logger.info(`Login attempt: ${success ? 'SUCCESS' : 'FAILED'}`, {
                email,
                ip,
                action: 'LOGIN'
            });
        },
        logout: (userId, ip) => {
            exports.logger.info('User logout', { userId, ip, action: 'LOGOUT' });
        },
        tokenRefresh: (userId, success) => {
            exports.logger.info(`Token refresh: ${success ? 'SUCCESS' : 'FAILED'}`, {
                userId,
                action: 'TOKEN_REFRESH'
            });
        }
    },
    // API logs
    api: {
        request: (method, path, userId, duration) => {
            exports.logger.http(`${method} ${path}`, { userId, duration, action: 'REQUEST' });
        },
        response: (method, path, statusCode, duration) => {
            exports.logger.http(`${method} ${path} ${statusCode}`, { statusCode, duration, action: 'RESPONSE' });
        }
    },
    // Database logs
    db: {
        query: (operation, duration, success) => {
            exports.logger.debug(`DB ${operation}`, { duration, success, action: 'DB_QUERY' });
        },
        error: (operation, error) => {
            exports.logger.error(`DB Error: ${operation}`, { error, action: 'DB_ERROR' });
        }
    }
};
exports.default = exports.logger;
