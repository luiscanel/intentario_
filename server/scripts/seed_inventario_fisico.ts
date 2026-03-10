import { prisma } from '../src/prisma/index'

const inventarioFisico = [
  {
    pais: 'España',
    categoria: 'Servidor',
    marca: 'Dell',
    modelo: 'PowerEdge R740',
    serie: 'DL7829341',
    inventario: 'INV-SE-001',
    estado: 'Activo',
    responsable: 'Juan Pérez',
    equipo: 'Servidor Dell R740',
    direccionIp: '192.168.1.10',
    ilo: '192.168.1.10-ilo',
    descripcion: 'Servidor de producción principal',
    sistemaOperativo: 'Ubuntu Server 22.04',
    garantia: '2026-12-31',
  },
  {
    pais: 'España',
    categoria: 'Servidor',
    marca: 'HP',
    modelo: 'ProLiant DL380 Gen10',
    serie: 'HP8294712',
    inventario: 'INV-SE-002',
    estado: 'Activo',
    responsable: 'María García',
    equipo: 'Servidor HP DL380',
    direccionIp: '192.168.1.20',
    ilo: '192.168.1.20-ilo',
    descripcion: 'Servidor de base de datos',
    sistemaOperativo: 'Ubuntu Server 22.04',
    garantia: '2026-12-31',
  },
  {
    pais: 'México',
    categoria: 'Workstation',
    marca: 'Dell',
    modelo: 'Precision 5820',
    serie: 'DL5129384',
    inventario: 'INV-WK-001',
    estado: 'Activo',
    responsable: 'Carlos López',
    equipo: 'Workstation de desarrollo',
    direccionIp: '192.168.10.100',
    descripcion: 'Workstation para desarrollo',
    sistemaOperativo: 'Windows 11 Pro',
    garantia: '2025-06-30',
  },
  {
    pais: 'España',
    categoria: 'Router',
    marca: 'Cisco',
    modelo: 'Catalyst 2960-X',
    serie: 'CS2947182',
    inventario: 'INV-NW-001',
    estado: 'Activo',
    responsable: 'Laura Rodríguez',
    equipo: 'Switch principal',
    descripcion: 'Switch de red principal',
    garantia: '2025-12-31',
  },
  {
    pais: 'Colombia',
    categoria: 'Firewall',
    marca: 'Fortinet',
    modelo: 'FortiGate 100F',
    serie: 'FT8472913',
    inventario: 'INV-FW-001',
    estado: 'Activo',
    responsable: 'Ana Martínez',
    equipo: 'Firewall perimetral',
    descripcion: 'Firewall de seguridad perimetral',
    garantia: '2026-06-30',
  },
  {
    pais: 'España',
    categoria: 'UPS',
    marca: 'APC',
    modelo: 'Smart-UPS 3000VA',
    serie: 'APC8294711',
    inventario: 'INV-UPS-001',
    estado: 'Activo',
    responsable: 'Juan Pérez',
    equipo: 'UPS datacenter',
    descripcion: 'UPS de respaldo eléctrico',
    garantia: '2025-12-31',
  },
  {
    pais: 'México',
    categoria: 'Storage',
    marca: 'Synology',
    modelo: 'DS3617xs',
    serie: 'SY8291827',
    inventario: 'INV-ST-001',
    estado: 'Activo',
    responsable: 'Carlos López',
    equipo: 'NAS principal',
    direccionIp: '192.168.2.30',
    descripcion: 'Almacenamiento NAS',
    sistemaOperativo: 'DSM 7.1',
    garantia: '2026-06-30',
  },
  {
    pais: 'España',
    categoria: 'Laptop',
    marca: 'Lenovo',
    modelo: 'ThinkPad X1 Carbon',
    serie: 'LN8472918',
    inventario: 'INV-LT-001',
    estado: 'Activo',
    responsable: 'María García',
    equipo: 'Laptop corporativa',
    descripcion: 'Laptop para trabajo remoto',
    sistemaOperativo: 'Windows 11 Pro',
    garantia: '2025-06-30',
  },
  {
    pais: 'España',
    categoria: 'Servidor',
    marca: 'Dell',
    modelo: 'PowerEdge R640',
    serie: 'DL9182736',
    inventario: 'INV-SE-003',
    estado: 'Inactivo',
    responsable: 'Juan Pérez',
    equipo: 'Servidor antiguo',
    direccionIp: '192.168.1.50',
    descripcion: 'Servidor dado de baja',
    sistemaOperativo: 'Windows Server 2016',
    garantia: '2024-12-31',
  },
  {
    pais: 'Colombia',
    categoria: 'Switch',
    marca: 'Juniper',
    modelo: 'EX4300-48T',
    serie: 'JN7291836',
    inventario: 'INV-NW-002',
    estado: 'Activo',
    responsable: 'Ana Martínez',
    equipo: 'Switch de distribución',
    descripcion: 'Switch de distribución',
    garantia: '2026-12-31',
  },
]

async function seedInventarioFisico() {
  console.log('🔄 Injectando datos de inventario físico...\n')

  try {
    for (const item of inventarioFisico) {
      const existente = await prisma.inventarioFisico.findFirst({ where: { serie: item.serie } })
      if (!existente) {
        await prisma.inventarioFisico.create({ data: item })
        console.log(`  ✅ Creado: ${item.inventario} - ${item.equipo}`)
      } else {
        console.log(`  ⏭️  Ya existe: ${item.inventario}`)
      }
    }

    console.log('\n✅ Inventario físico injectado correctamente!')
  } catch (error) {
    console.error('\n❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedInventarioFisico()
