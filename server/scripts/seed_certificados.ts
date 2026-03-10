import { prisma } from '../src/prisma/index'

const certificados = [
  {
    dominio: 'grupoalmo.com',
    tipo: 'wildcard',
    emisor: 'Let\'s Encrypt',
    fechaEmision: new Date('2024-06-01'),
    fechaVencimiento: new Date('2025-06-01'),
    proveedorId: 1,
    notas: 'Certificado wildcard para todos los subdominios',
    activo: true,
  },
  {
    dominio: 'www.grupoalmo.com',
    tipo: 'single',
    emisor: 'Let\'s Encrypt',
    fechaEmision: new Date('2024-06-01'),
    fechaVencimiento: new Date('2025-06-01'),
    proveedorId: 1,
    notas: 'Certificado para sitio principal',
    activo: true,
  },
  {
    dominio: 'api.grupoalmo.com',
    tipo: 'single',
    emisor: 'DigiCert',
    fechaEmision: new Date('2024-03-01'),
    fechaVencimiento: new Date('2025-03-01'),
    proveedorId: 1,
    notas: 'Certificado para API',
    activo: true,
  },
  {
    dominio: 'mail.grupoalmo.com',
    tipo: 'single',
    emisor: 'Let\'s Encrypt',
    fechaEmision: new Date('2024-05-01'),
    fechaVencimiento: new Date('2025-05-01'),
    proveedorId: 1,
    notas: 'Certificado para servidor de correo',
    activo: true,
  },
  {
    dominio: 'grupoalmo.mx',
    tipo: 'single',
    emisor: 'Let\'s Encrypt',
    fechaEmision: new Date('2024-04-01'),
    fechaVencimiento: new Date('2025-04-01'),
    proveedorId: 2,
    notas: 'Certificado para Mexico',
    activo: true,
  },
  {
    dominio: 'grupoalmo.co',
    tipo: 'single',
    emisor: 'Let\'s Encrypt',
    fechaEmision: new Date('2024-04-01'),
    fechaVencimiento: new Date('2025-04-01'),
    proveedorId: 3,
    notas: 'Certificado para Colombia',
    activo: true,
  },
  {
    dominio: 'admin.grupoalmo.com',
    tipo: 'single',
    emisor: 'DigiCert',
    fechaEmision: new Date('2024-02-01'),
    fechaVencimiento: new Date('2025-02-01'),
    proveedorId: 1,
    notas: 'Certificado para panel de administracion',
    activo: true,
  },
  {
    dominio: 'cdn.grupoalmo.com',
    tipo: 'wildcard',
    emisor: 'Cloudflare',
    fechaEmision: new Date('2024-01-01'),
    fechaVencimiento: new Date('2025-01-01'),
    proveedorId: 1,
    notas: 'Certificado CDN Cloudflare',
    activo: true,
  },
  {
    dominio: 'vpn.grupoalmo.com',
    tipo: 'single',
    emisor: 'Let\'s Encrypt',
    fechaEmision: new Date('2024-07-01'),
    fechaVencimiento: new Date('2025-07-01'),
    proveedorId: 1,
    notas: 'Certificado para VPN',
    activo: true,
  },
  {
    dominio: 'old.grupoalmo.com',
    tipo: 'single',
    emisor: 'Let\'s Encrypt',
    fechaEmision: new Date('2023-06-01'),
    fechaVencimiento: new Date('2024-06-01'),
    proveedorId: 1,
    notas: 'Certificado vencido',
    activo: false,
  },
]

async function seedCertificados() {
  console.log('🔄 Injectando datos de certificados SSL...\n')

  try {
    for (const item of certificados) {
      const existente = await prisma.certificadoSSL.findFirst({ where: { dominio: item.dominio } })
      if (!existente) {
        await prisma.certificadoSSL.create({ data: item })
        console.log(`  ✅ Creado: ${item.dominio} (${item.emisor})`)
      } else {
        console.log(`  ⏭️  Ya existe: ${item.dominio}`)
      }
    }

    console.log('\n✅ Certificados SSL injectados correctamente!')
  } catch (error) {
    console.error('\n❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedCertificados()
