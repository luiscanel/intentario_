import { prisma } from '../src/prisma/index'

const licencias = [
  {
    nombre: 'Windows Server 2022 Datacenter',
    tipo: 'Windows',
    version: '2022',
    cantidad: 5,
    usada: 3,
    costo: 1800,
    moneda: 'USD',
    fechaCompra: new Date('2024-01-15'),
    fechaVencimiento: new Date('2027-01-15'),
    proveedorId: 2,
    notas: 'Licencias para servidores de produccion',
    activa: true,
  },
  {
    nombre: 'Windows 11 Pro',
    tipo: 'Windows',
    version: '11 Pro',
    cantidad: 50,
    usada: 35,
    costo: 2500,
    moneda: 'USD',
    fechaCompra: new Date('2024-06-01'),
    fechaVencimiento: new Date('2025-06-01'),
    proveedorId: 2,
    notas: 'Licencias para workstations',
    activa: true,
  },
  {
    nombre: 'Microsoft Office 365 Business',
    tipo: 'Office',
    version: '365',
    cantidad: 100,
    usada: 85,
    costo: 1200,
    moneda: 'USD',
    fechaCompra: new Date('2024-03-01'),
    fechaVencimiento: new Date('2025-03-01'),
    proveedorId: 2,
    notas: 'Suscripcion anual',
    activa: true,
  },
  {
    nombre: 'SQL Server 2022 Enterprise',
    tipo: 'SQL',
    version: '2022 Enterprise',
    cantidad: 3,
    usada: 2,
    costo: 15000,
    moneda: 'USD',
    fechaCompra: new Date('2024-02-01'),
    fechaVencimiento: new Date('2027-02-01'),
    proveedorId: 2,
    notas: 'Licencias para bases de datos criticas',
    activa: true,
  },
  {
    nombre: 'ESET Endpoint Security',
    tipo: 'Antivirus',
    version: 'Business',
    cantidad: 100,
    usada: 75,
    costo: 1500,
    moneda: 'USD',
    fechaCompra: new Date('2024-04-01'),
    fechaVencimiento: new Date('2025-04-01'),
    proveedorId: 7,
    notas: 'Licencias de antivirus',
    activa: true,
  },
  {
    nombre: 'VMware vSphere 7',
    tipo: 'Virtualizacion',
    version: '7 Enterprise Plus',
    cantidad: 2,
    usada: 2,
    costo: 8000,
    moneda: 'USD',
    fechaCompra: new Date('2023-06-01'),
    fechaVencimiento: new Date('2026-06-01'),
    notas: 'Licencias de virtualizacion',
    activa: true,
  },
  {
    nombre: 'Adobe Creative Cloud',
    tipo: 'Otro',
    version: '2024',
    cantidad: 10,
    usada: 8,
    costo: 2400,
    moneda: 'USD',
    fechaCompra: new Date('2024-01-01'),
    fechaVencimiento: new Date('2025-01-01'),
    notas: 'Licencias para diseno',
    activa: true,
  },
  {
    nombre: 'Ubuntu Pro',
    tipo: 'Otro',
    version: '22.04 LTS',
    cantidad: 20,
    usada: 15,
    costo: 0,
    moneda: 'USD',
    fechaCompra: new Date('2024-01-01'),
    notas: 'Soporte comercial de Ubuntu',
    activa: true,
  },
  {
    nombre: 'Veeam Backup Replication',
    tipo: 'Otro',
    version: '12',
    cantidad: 2,
    usada: 1,
    costo: 600,
    moneda: 'USD',
    fechaCompra: new Date('2024-05-01'),
    fechaVencimiento: new Date('2025-05-01'),
    notas: 'Licencias para backup',
    activa: true,
  },
  {
    nombre: 'Red Hat Enterprise Linux',
    tipo: 'Otro',
    version: '9',
    cantidad: 10,
    usada: 8,
    costo: 3000,
    moneda: 'USD',
    fechaCompra: new Date('2024-02-15'),
    fechaVencimiento: new Date('2025-02-15'),
    notas: 'Suscripcion anual RHEL',
    activa: true,
  },
]

async function seedLicencias() {
  console.log('🔄 Injectando datos de licencias...\n')

  try {
    for (const item of licencias) {
      const existente = await prisma.licencia.findFirst({ where: { nombre: item.nombre } })
      if (!existente) {
        await prisma.licencia.create({ data: item })
        console.log(`  ✅ Creado: ${item.nombre}`)
      } else {
        console.log(`  ⏭️  Ya existe: ${item.nombre}`)
      }
    }

    console.log('\n✅ Licencias injectadas correctamente!')
  } catch (error) {
    console.error('\n❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedLicencias()
