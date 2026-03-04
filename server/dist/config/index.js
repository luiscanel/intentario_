"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityConfig = exports.config = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    // Server
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().default('3001'),
    HOST: zod_1.z.string().default('0.0.0.0'),
    // JWT - CRÍTICO: En producción debe definirse
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres en producción'),
    JWT_EXPIRES_IN: zod_1.z.string().default('24h'),
    // Database
    DATABASE_URL: zod_1.z.string().default('file:./prisma/dev.db'),
    // CORS
    CORS_ORIGIN: zod_1.z.string().default('*'),
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: zod_1.z.string().default('15 minutes'),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.string().default('100'),
    // Rate Limiting Auth (más estricto)
    AUTH_RATE_LIMIT_MAX: zod_1.z.string().default('5'),
    // Email (opcional)
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.string().optional(),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    SMTP_FROM: zod_1.z.string().optional(),
});
function loadConfig() {
    // Verificar variables críticas en producción
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'production') {
        if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
            console.error('❌ ERROR: JWT_SECRET debe tener al menos 32 caracteres en producción');
            process.exit(1);
        }
    }
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error('❌ ERROR: Variables de entorno inválidas:');
        result.error.issues.forEach(issue => {
            console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
        });
        process.exit(1);
    }
    return result.data;
}
exports.config = loadConfig();
// Configuración de seguridad derivada
exports.securityConfig = {
    isProduction: exports.config.NODE_ENV === 'production',
    corsOrigin: exports.config.CORS_ORIGIN,
    rateLimit: {
        windowMs: parseRateLimitTime(exports.config.RATE_LIMIT_WINDOW_MS),
        max: parseInt(exports.config.RATE_LIMIT_MAX_REQUESTS),
    },
    authRateLimit: {
        windowMs: parseRateLimitTime(exports.config.RATE_LIMIT_WINDOW_MS),
        max: parseInt(exports.config.AUTH_RATE_LIMIT_MAX),
    },
};
function parseRateLimitTime(time) {
    const match = time.match(/^(\d+)\s*(minutes?|hours?|seconds?)$/i);
    if (!match)
        return 15 * 60 * 1000; // 15 minutos por defecto
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    switch (unit) {
        case 'second':
        case 'seconds':
            return value * 1000;
        case 'minute':
        case 'minutes':
            return value * 60 * 1000;
        case 'hour':
        case 'hours':
            return value * 60 * 60 * 1000;
        default:
            return 15 * 60 * 1000;
    }
}
