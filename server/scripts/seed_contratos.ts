import { prisma } from '../src/prisma/index'

const contratos = [
  {
    proveedorId: 1,
    tipo: 'Hosting',
    numero: 'CTR-AWS-001',
    objeto: 'Servicios de cloud computing AWS',
    monto: 15000,
    moneda: 'USD',
    fechaInicio: new Date('2024-01-01'),
    fechaFin: new Date('2025-12-31'),
    estado: 'Activo',
    observaciones: 'Contrato anual con facturacion mensual',
    diasAviso: 30,
  },
  {
    proveedorId: 2,
    tipo: 'Hosting',
    numero: 'CTR-AZURE-001',
    objeto: 'Servicios de Microsoft Azure',
    monto: 8000,
    moneda: 'USD',
    fechaInicio: new Date('2024-01-01'),
    fechaFin: new Date('2025-12-31'),
    estado: 'Activo',
    observaciones: 'Contrato para Mexico',
    diasAviso: 30,
  },
  {
    proveedorId: 3,
    tipo: 'Soporte',
    numero: 'CTR-GCP-001',
    objeto: 'Soporte tecnico Google Cloud',
    monto: 5000,
    moneda: 'USD',
    fechaInicio: new Date('2024-03-01'),
    fechaFin: new Date('2025-02-28'),
    estado: 'Activo',
    observaciones: 'Soporte premium 24x7',
    diasAviso: 30,
  },
  {
    proveedorId: 4,
    tipo: 'Mantenimiento',
    numero: 'CTR-DELL-001',
    objeto: 'Mantenimiento de servidores Dell',
    monto: 3500,
    moneda: 'USD',
    fechaInicio: new Date('2024-01-01'),
    fechaFin: new Date('2024-12-31'),
    estado: 'Vencido',
    observaciones: 'Contrato de mantenimiento anual',
    diasAviso: 30,
  },
  {
    proveedorId: 5,
    tipo: 'Mantenimiento',
    numero: 'CTR-HPE-001',
    objeto: 'Mantenimiento de servidores HP',
    monto: 3000,
    moneda: 'USD',
    fechaInicio: new Date('2024-01-01'),
    fechaFin: new Date('2024-12-31'),
    estado: 'Vencido',
    observaciones: 'Contrato de mantenimiento anual',
    diasAviso: 30,
  },
  {
    proveedorId: 6,
    tipo: 'Garantia',
    numero: 'CTR-CISCO-001',
    objeto: 'Garantia y soporte Cisco',
    monto: 2000,
    moneda: 'USD',
    fechaInicio: new Date('2024-06-01'),
    fechaFin: new Date('2025-05-31'),
    estado: 'Activo',
    observaciones: 'Soporte tecnico para equipos de red',
    diasAviso: 30,
  },
  {
    proveedorId: 7,
    tipo: 'Licencia',
    numero: 'CTR-ESET-001',
    objeto: 'Licencias ESET Endpoint Security',
    monto: 1500,
    moneda: 'USD',
    fechaInicio: new Date('2024-04-01'),
    fechaFin: new Date('2025-03-31'),
    estado: 'Activo',
    observaciones: 'Renovacion anual',
    diasAviso: 30,
  },
  {
    proveedorId: 8,
    tipo: 'Garantia',
    numero: 'CTR-FORT-001',
    objeto: 'Garantia Fortinet FortiGate',
    monto: 1200,
    moneda: 'USD',
    fechaInicio: new Date('2024-06-01'),
    fechaFin: new Date('2025-05-31'),
    estado: 'Activo',
    observaciones: 'Soporte tecnico para firewall',
    diasAviso: 30,
  },
  {
    proveedorId: 9,
    tipo: 'Mantenimiento',
    numero: 'CTR-SYN-001',
    objeto: 'Mantenimiento Synology NAS',
    monto: 800,
    moneda: 'USD',
    fechaInicio: new Date('2024-05-01'),
    fechaFin: new Date('2025-04-30'),
    estado: 'Activo',
    observaciones: 'Mantenimiento anual NAS',
    diasAviso: 30,
  },
  {
    proveedorId: 10,
    tipo: 'Mantenimiento',
    numero: 'CTR-APC-001',
    objeto: 'Mantenimiento UPS APC',
    monto: 500,
    moneda: 'USD',
    fechaInicio: new Date('2024-01-01'),
    fechaFin: new Date('2024-12-31'),
    estado: 'Vencido',
    observaciones: 'Mantenimiento anual UPS',
    diasAviso: 30,
  },
]

async function seedContratos() {
  console.log('🔄 Injectando datos de contratos...\n')

  try {
    for (const item of contratos) {
      const existente = await prisma.contrato.findFirst({ where: { numero: item.numero } })
      if (!existente) {
        await prisma.contrato.create({ data: item })
        console.log(`  ✅ Creado: ${item.numero}`)
      } else {
        console.log(`  ⏭️  Ya existe: ${item.numero}`)
      }
    }

    console.log('\n✅ Contratos injectados correctamente!')
  } catch (error) {
    console.error('\n❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedContratos()
