"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma ?? new client_1.PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    },
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn']
});
// Optimizaciones de SQLite para producción
if (process.env.NODE_ENV === 'production') {
    exports.prisma.$connect().then(async () => {
        try {
            // Limitar cache de SQLite (en KB)
            await exports.prisma.$executeRawUnsafe('PRAGMA cache_size = -2000'); // 2MB cache
            // Modo WAL para mejor rendimiento
            await exports.prisma.$executeRawUnsafe('PRAGMA journal_mode = WAL');
            // Sincronización menos frecuente
            await exports.prisma.$executeRawUnsafe('PRAGMA synchronous = NORMAL');
            // Temp store en memoria
            await exports.prisma.$executeRawUnsafe('PRAGMA temp_store = MEMORY');
            console.log('✅ SQLite optimizado para producción');
        }
        catch (e) {
            // Ignorar errores de PRAGMA en desarrollo
        }
    });
}
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = exports.prisma;
}
