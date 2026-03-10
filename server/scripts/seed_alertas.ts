import { prisma } from '../src/prisma/index'

const alertas = [
  {
    tipo: 'warning',
    titulo: 'Servidor sin监控',
    mensaje: 'El servidor srv-old-01 no responde a los checks de disponibilidad',
    entidad: 'Servidor',
    entidadId: 8,
    leida: false,
  },
  {
    tipo: 'info',
    titulo: 'Nuevo servidor agregado',
    mensaje: 'Se ha agregado el servidor BACKUP-01 al inventario',
    entidad: 'Servidor',
    entidadId: 4,
    leida: true,
    leidaPor: 'admin@inventario.local',
  },
  {
    tipo: 'warning',
    titulo: 'Certificado SSL proximo a vencer',
    mensaje: 'El certificado de old.grupoalmo.com vence en 30 dias',
    entidad: 'CertificadoSSL',
    entidadId: 10,
    leida: false,
  },
  {
    tipo: 'critical',
    titulo: 'Contrato vencido',
    mensaje: 'El contrato CTR-DELL-001 ha vencido',
    entidad: 'Contrato',
    entidadId: 4,
    leida: false,
  },
  {
    tipo: 'warning',
    titulo: 'Licencia proxima a vencer',
    mensaje: 'La licencia Windows 11 Pro vence en 60 dias',
    entidad: 'Licencia',
    entidadId: 2,
    leida: false,
  },
  {
    tipo: 'error',
    titulo: 'Servidor caido',
    mensaje: 'El servidor 192.168.1.99 esta fuera de linea',
    entidad: 'Disponibilidad',
    entidadId: 9,
    leida: false,
  },
  {
    tipo: 'info',
    titulo: 'Backup completado',
    mensaje: 'El backup programado se ha completado exitosamente',
    entidad: 'BackupProgramado',
    leida: true,
    leidaPor: 'admin@inventario.local',
  },
  {
    tipo: 'warning',
    titulo: 'Garantia proxima a vencer',
    mensaje: 'La garantia del servidor TEST-01 vence en 60 dias',
    entidad: 'Servidor',
    entidadId: 5,
    leida: false,
  },
  {
    tipo: 'info',
    titulo: 'Usuario nuevo registrado',
    mensaje: 'Se ha registrado un nuevo usuario en el sistema',
    entidad: 'User',
    leida: true,
    leidaPor: 'admin@inventario.local',
  },
  {
    tipo: 'warning',
    titulo: 'Alta utilizacion de CPU',
    mensaje: 'El servidor APP-PROD-01 tiene utilizacion de CPU superior al 80%',
    entidad: 'Servidor',
    entidadId: 3,
    leida: false,
  },
]

async function seedAlertas() {
  console.log('🔄 Injectando datos de alertas...\n')

  try {
    for (const item of alertas) {
      await prisma.alerta.create({ data: item })
      console.log(`  ✅ Creado: ${item.titulo}`)
    }

    console.log('\n✅ Alertas injectadas correctamente!')
  } catch (error) {
    console.error('\n❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedAlertas()
