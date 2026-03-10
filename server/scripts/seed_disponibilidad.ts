import { prisma } from '../src/prisma/index'

const disponibilidad = [
  {
    ip: '192.168.1.10',
    nombre: 'srv-web-01.grupoalmo.com',
    tipo: 'https',
    puerto: 443,
    status: 'online',
    latency: 45,
  },
  {
    ip: '192.168.1.20',
    nombre: 'srv-db-01.grupoalmo.com',
    tipo: 'mysql',
    puerto: 3306,
    status: 'online',
    latency: 12,
  },
  {
    ip: '192.168.1.30',
    nombre: 'srv-backup-01.grupoalmo.com',
    tipo: 'ssh',
    puerto: 22,
    status: 'online',
    latency: 8,
  },
  {
    ip: '192.168.1.40',
    nombre: 'srv-mail-01.grupoalmo.com',
    tipo: 'https',
    puerto: 443,
    status: 'online',
    latency: 32,
  },
  {
    ip: '192.168.2.10',
    nombre: 'srv-app-01.grupoalmo.mx',
    tipo: 'https',
    puerto: 443,
    status: 'online',
    latency: 120,
  },
  {
    ip: '8.8.8.8',
    nombre: 'dns-google',
    tipo: 'dns',
    puerto: 53,
    status: 'online',
    latency: 25,
  },
  {
    ip: '1.1.1.1',
    nombre: 'dns-cloudflare',
    tipo: 'dns',
    puerto: 53,
    status: 'online',
    latency: 18,
  },
  {
    ip: '52.15.123.45',
    nombre: 'aws-prod-web',
    tipo: 'https',
    puerto: 443,
    status: 'online',
    latency: 85,
  },
  {
    ip: '192.168.1.99',
    nombre: 'srv-old-01.grupoalmo.com',
    tipo: 'ssh',
    puerto: 22,
    status: 'offline',
    latency: null,
  },
  {
    ip: '40.117.45.123',
    nombre: 'azure-app-mx',
    tipo: 'https',
    puerto: 443,
    status: 'online',
    latency: 95,
  },
]

async function seedDisponibilidad() {
  console.log('🔄 Injectando datos de disponibilidad...\n')

  try {
    for (const item of disponibilidad) {
      const existente = await prisma.disponibilidad.findFirst({ where: { ip: item.ip } })
      if (!existente) {
        await prisma.disponibilidad.create({ data: item })
        console.log(`  ✅ Creado: ${item.nombre} (${item.ip}) - ${item.status}`)
      } else {
        console.log(`  ⏭️  Ya existe: ${item.nombre}`)
      }
    }

    console.log('\n✅ Disponibilidad injectada correctamente!')
  } catch (error) {
    console.error('\n❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedDisponibilidad()
