import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn']
})

// Optimizaciones de SQLite para producción
if (process.env.NODE_ENV === 'production') {
  prisma.$connect().then(async () => {
    try {
      // Limitar cache de SQLite (en KB) - usar $queryRaw para evitar error de resultados
      await prisma.$queryRaw`PRAGMA cache_size = -2000` // 2MB cache
      // Modo WAL para mejor rendimiento
      await prisma.$queryRaw`PRAGMA journal_mode = WAL`
      // Sincronización menos frecuente
      await prisma.$queryRaw`PRAGMA synchronous = NORMAL`
      // Temp store en memoria
      await prisma.$queryRaw`PRAGMA temp_store = MEMORY`
      console.log('✅ SQLite optimizado para producción')
    } catch (e) {
      // Ignorar errores de PRAGMA en desarrollo
    }
  })
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
