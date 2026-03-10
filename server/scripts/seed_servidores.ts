import { prisma } from '../src/prisma/index'

const servidores = [
  {
    pais: 'España',
    host: 'srv-web-01.grupoalmo.com',
    nombreVM: 'WEB-PROD-01',
    ip: '192.168.1.10',
    tipo: 'Virtual',
    cpu: 4,
    memoria: '16GB',
    disco: '500GB SSD',
    ambiente: 'Producción',
    arquitectura: 'x64',
    sistemaOperativo: 'Ubuntu Server',
    version: '22.04 LTS',
    antivirus: 'ESET Endpoint',
    estado: 'Activo',
    responsable: 'Juan Pérez',
    fechaGarantia: new Date('2026-12-31'),
  },
  {
    pais: 'España',
    host: 'srv-db-01.grupoalmo.com',
    nombreVM: 'DB-PROD-01',
    ip: '192.168.1.20',
    tipo: 'Virtual',
    cpu: 8,
    memoria: '32GB',
    disco: '1TB SSD',
    ambiente: 'Producción',
    arquitectura: 'x64',
    sistemaOperativo: 'Ubuntu Server',
    version: '22.04 LTS',
    antivirus: 'ESET Endpoint',
    estado: 'Activo',
    responsable: 'María García',
    fechaGarantia: new Date('2026-12-31'),
  },
  {
    pais: 'México',
    host: 'srv-app-01.grupoalmo.mx',
    nombreVM: 'APP-PROD-01',
    ip: '192.168.2.10',
    tipo: 'Físico',
    cpu: 16,
    memoria: '64GB',
    disco: '2TB SSD',
    ambiente: 'Producción',
    arquitectura: 'x64',
    sistemaOperativo: 'Windows Server',
    version: '2019 Datacenter',
    antivirus: 'Windows Defender',
    estado: 'Activo',
    responsable: 'Carlos López',
    fechaGarantia: new Date('2027-06-30'),
  },
  {
    pais: 'España',
    host: 'srv-backup-01.grupoalmo.com',
    nombreVM: 'BACKUP-01',
    ip: '192.168.1.30',
    tipo: 'Virtual',
    cpu: 4,
    memoria: '8GB',
    disco: '4TB HDD',
    ambiente: 'Producción',
    arquitectura: 'x64',
    sistemaOperativo: 'Ubuntu Server',
    version: '22.04 LTS',
    antivirus: 'ESET Endpoint',
    estado: 'Activo',
    responsable: 'Juan Pérez',
    fechaGarantia: new Date('2025-12-31'),
  },
  {
    pais: 'Colombia',
    host: 'srv-test-01.grupoalmo.co',
    nombreVM: 'TEST-01',
    ip: '192.168.3.10',
    tipo: 'Virtual',
    cpu: 2,
    memoria: '4GB',
    disco: '100GB SSD',
    ambiente: 'Desarrollo',
    arquitectura: 'x64',
    sistemaOperativo: 'Ubuntu Server',
    version: '22.04 LTS',
    antivirus: 'ESET Endpoint',
    estado: 'Activo',
    responsable: 'Ana Martínez',
    fechaGarantia: new Date('2025-06-30'),
  },
  {
    pais: 'España',
    host: 'srv-mail-01.grupoalmo.com',
    nombreVM: 'MAIL-PROD-01',
    ip: '192.168.1.40',
    tipo: 'Virtual',
    cpu: 4,
    memoria: '16GB',
    disco: '500GB SSD',
    ambiente: 'Producción',
    arquitectura: 'x64',
    sistemaOperativo: 'Ubuntu Server',
    version: '22.04 LTS',
    antivirus: 'ESET Endpoint',
    estado: 'Activo',
    responsable: 'Laura Rodríguez',
    fechaGarantia: new Date('2026-12-31'),
  },
  {
    pais: 'México',
    host: 'srv-files-01.grupoalmo.mx',
    nombreVM: 'FILES-PROD-01',
    ip: '192.168.2.20',
    tipo: 'Físico',
    cpu: 8,
    memoria: '32GB',
    disco: '8TB NAS',
    ambiente: 'Producción',
    arquitectura: 'x64',
    sistemaOperativo: 'Windows Server',
    version: '2022 Datacenter',
    antivirus: 'Windows Defender',
    estado: 'Activo',
    responsable: 'Carlos López',
    fechaGarantia: new Date('2027-06-30'),
  },
  {
    pais: 'España',
    host: 'srv-old-01.grupoalmo.com',
    nombreVM: 'LEGACY-01',
    ip: '192.168.1.50',
    tipo: 'Físico',
    cpu: 4,
    memoria: '8GB',
    disco: '500GB HDD',
    ambiente: 'Producción',
    arquitectura: 'x64',
    sistemaOperativo: 'Windows Server',
    version: '2016 Standard',
    antivirus: 'ESET Endpoint',
    estado: 'Inactivo',
    responsable: 'Juan Pérez',
    fechaGarantia: new Date('2024-12-31'),
  },
]

async function seedServidores() {
  console.log('🔄 Injectando datos de servidores...\n')

  try {
    for (const servidor of servidores) {
      const existente = await prisma.servidor.findFirst({ where: { ip: servidor.ip } })
      if (!existente) {
        await prisma.servidor.create({ data: servidor })
        console.log(`  ✅ Servidor creado: ${servidor.nombreVM} (${servidor.ip})`)
      } else {
        console.log(`  ⏭️  Ya existe: ${servidor.nombreVM}`)
      }
    }

    console.log('\n✅ Servidores injectados correctamente!')
  } catch (error) {
    console.error('\n❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedServidores()
