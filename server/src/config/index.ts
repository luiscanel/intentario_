import { z } from 'zod'

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  HOST: z.string().default('0.0.0.0'),
  
  // JWT - CRÍTICO: En producción debe definirse
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres en producción'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  
  // Database
  DATABASE_URL: z.string().default('file:./prisma/dev.db'),
  
  // CORS
  CORS_ORIGIN: z.string().default('*'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('15 minutes'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  
  // Rate Limiting Auth (más estricto)
  AUTH_RATE_LIMIT_MAX: z.string().default('5'),
  
  // Email (opcional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
})

export type EnvConfig = z.infer<typeof envSchema>

function loadConfig() {
  // Verificar variables críticas en producción
  const nodeEnv = process.env.NODE_ENV || 'development'
  
  if (nodeEnv === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      console.error('❌ ERROR: JWT_SECRET debe tener al menos 32 caracteres en producción')
      process.exit(1)
    }
  }

  const result = envSchema.safeParse(process.env)
  
  if (!result.success) {
    console.error('❌ ERROR: Variables de entorno inválidas:')
    result.error.issues.forEach(issue => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
    })
    process.exit(1)
  }

  return result.data
}

export const config = loadConfig()

// Configuración de seguridad derivada
export const securityConfig = {
  isProduction: config.NODE_ENV === 'production',
  corsOrigin: config.CORS_ORIGIN,
  rateLimit: {
    windowMs: parseRateLimitTime(config.RATE_LIMIT_WINDOW_MS),
    max: parseInt(config.RATE_LIMIT_MAX_REQUESTS),
  },
  authRateLimit: {
    windowMs: parseRateLimitTime(config.RATE_LIMIT_WINDOW_MS),
    max: parseInt(config.AUTH_RATE_LIMIT_MAX),
  },
}

function parseRateLimitTime(time: string): number {
  const match = time.match(/^(\d+)\s*(minutes?|hours?|seconds?)$/i)
  if (!match) return 15 * 60 * 1000 // 15 minutos por defecto
  
  const value = parseInt(match[1])
  const unit = match[2].toLowerCase()
  
  switch (unit) {
    case 'second':
    case 'seconds':
      return value * 1000
    case 'minute':
    case 'minutes':
      return value * 60 * 1000
    case 'hour':
    case 'hours':
      return value * 60 * 60 * 1000
    default:
      return 15 * 60 * 1000
  }
}
