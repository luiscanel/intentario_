import { prisma } from '../src/prisma/index'

const proveedores = [
  {
    nombre: 'Amazon Web Services (AWS)',
    contacto: 'Carlos Sánchez',
    email: 'aws-sales@amazon.com',
    telefono: '+1-206-555-0100',
    direccion: '410 Terry Avenue North, Seattle, WA 98109',
    servicios: 'Cloud Computing,Storage,CDN,Database',
    notas: 'Proveedor principal de infraestructura cloud',
    activo: true,
  },
  {
    nombre: 'Microsoft Azure',
    contacto: 'María López',
    email: 'azure@microsoft.com',
    telefono: '+1-800-555-0100',
    direccion: 'One Microsoft Way, Redmond, WA 98052',
    servicios: 'Cloud Computing,Virtual Machines,Storage,AI',
    notas: 'Proveedor de cloud para México',
    activo: true,
  },
  {
    nombre: 'Google Cloud Platform',
    contacto: 'Ana García',
    email: 'gcp@google.com',
    telefono: '+1-650-555-0100',
    direccion: '1600 Amphitheatre Parkway, Mountain View, CA 94043',
    servicios: 'Cloud Computing,Big Data,Machine Learning',
    notas: 'Proveedor de cloud para Colombia',
    activo: true,
  },
  {
    nombre: 'Dell Technologies',
    contacto: 'Juan Pérez',
    email: 'dell@dell.com',
    telefono: '+1-800-555-0100',
    direccion: 'One Dell Way, Round Rock, TX 78682',
    servicios: 'Servidores,Storage,Networking',
    notas: 'Proveedor de hardware de servidores',
    activo: true,
  },
  {
    nombre: 'Hewlett Packard Enterprise',
    contacto: 'Laura Martínez',
    email: 'hpe@hpe.com',
    telefono: '+1-800-555-0100',
    direccion: '1701 E. Mossy Oaks Road, Spring, TX 77389',
    servicios: 'Servidores,Storage,Networking',
    notas: 'Proveedor de infraestructura',
    activo: true,
  },
  {
    nombre: 'Cisco Systems',
    contacto: 'Miguel Torres',
    email: 'cisco@cisco.com',
    telefono: '+1-800-555-0100',
    direccion: '170 West Tasman Drive, San Jose, CA 95134',
    servicios: 'Networking,Security,Collaboration',
    notas: 'Proveedor de equipos de red',
    activo: true,
  },
  {
    nombre: 'ESET',
    contacto: 'Patricia Ruiz',
    email: 'eset@eset.com',
    telefono: '+1-800-555-0100',
    direccion: 'Avenue de la Gare 12, 1003 Lausanne, Switzerland',
    servicios: 'Antivirus,Security',
    notas: 'Licencias de antivirus',
    activo: true,
  },
  {
    nombre: 'Fortinet',
    contacto: 'Roberto Díaz',
    email: 'fortinet@fortinet.com',
    telefono: '+1-800-555-0100',
    direccion: '899 Kifer Road, Sunnyvale, CA 94086',
    servicios: 'Firewall,Security,VPN',
    notas: 'Proveedor de seguridad perimetral',
    activo: true,
  },
  {
    nombre: 'Synology',
    contacto: 'Sofia Chen',
    email: 'synology@synology.com',
    telefono: '+1-425-555-0100',
    direccion: '5785 Morehouse Drive, San Diego, CA 92121',
    servicios: 'NAS,Storage,Backup',
    notas: 'Proveedor de almacenamiento NAS',
    activo: true,
  },
  {
    nombre: 'APC by Schneider Electric',
    contacto: 'Fernando Gómez',
    email: 'apc@apc.com',
    telefono: '+1-800-555-0100',
    direccion: '1300 E. Club Drive, Kingsport, TN 37663',
    servicios: 'UPS,Power Distribution',
    notas: 'Proveedor de energía y UPS',
    activo: true,
  },
]

async function seedProveedores() {
  console.log('🔄 Injectando datos de proveedores...\n')

  try {
    for (const item of proveedores) {
      const existente = await prisma.proveedor.findFirst({ where: { nombre: item.nombre } })
      if (!existente) {
        await prisma.proveedor.create({ data: item })
        console.log(`  ✅ Creado: ${item.nombre}`)
      } else {
        console.log(`  ⏭️  Ya existe: ${item.nombre}`)
      }
    }

    console.log('\n✅ Proveedores injectados correctamente!')
  } catch (error) {
    console.error('\n❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedProveedores()
