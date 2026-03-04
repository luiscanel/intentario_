import { prisma } from '../src/prisma/index'
import bcrypt from 'bcryptjs'

// Módulos base del sistema (deben coincidir con Layout.tsx)
const modulosBase = [
  { nombre: 'dashboard', descripcion: 'Panel principal', icono: 'LayoutDashboard', orden: 1 },
  { nombre: 'inventario_servidores', descripcion: 'Inventario de servidores on-premise', icono: 'Server', orden: 2 },
  { nombre: 'inventario_cloud', descripcion: 'Inventario de servicios en la nube', icono: 'Cloud', orden: 3 },
  { nombre: 'inventario_fisico', descripcion: 'Inventario físico de equipos', icono: 'HardDrive', orden: 4 },
  { nombre: 'monitor', descripcion: 'Monitor de disponibilidad', icono: 'Activity', orden: 5 },
  { nombre: 'proveedores', descripcion: 'Gestión de proveedores', icono: 'Building2', orden: 6 },
  { nombre: 'licencias', descripcion: 'Gestión de licencias', icono: 'FileKey', orden: 7 },
  { nombre: 'contratos', descripcion: 'Gestión de contratos', icono: 'FileCheck', orden: 8 },
  { nombre: 'alertas', descripcion: 'Sistema de alertas', icono: 'Bell', orden: 9 },
  { nombre: 'seguridad', descripcion: 'Dashboard de seguridad', icono: 'Shield', orden: 10 },
  { nombre: 'recursos', descripcion: 'Dashboard de recursos', icono: 'Cpu', orden: 11 },
  { nombre: 'disponibilidad', descripcion: 'Dashboard de disponibilidad', icono: 'Activity', orden: 12 },
  { nombre: 'responsables', descripcion: 'Gestión de responsables', icono: 'User', orden: 13 },
  { nombre: 'informes', descripcion: 'Reportes e informes', icono: 'FileText', orden: 14 },
  { nombre: 'admin', descripcion: 'Administración del sistema', icono: 'Users', orden: 15 },
  { nombre: 'audit_log', descripcion: 'Registro de auditoria', icono: 'History', orden: 16 },
]

// Permisos por módulo
const permisosBase = ['ver', 'crear', 'editar', 'eliminar', 'exportar']

// Roles con sus módulos y permisos
const rolesBase = [
  {
    nombre: 'admin',
    descripcion: 'Administrador con acceso completo',
    esBase: true,
    modulos: modulosBase.map(m => m.nombre), // Todos los módulos
    permisos: modulosBase.flatMap(m => permisosBase.map(p => ({ modulo: m.nombre, accion: p }))) // Todos los permisos
  },
  {
    nombre: 'usuario',
    descripcion: 'Usuario básico con acceso de solo lectura',
    esBase: true,
    modulos: ['dashboard', 'inventario_servidores', 'inventario_cloud', 'inventario_fisico', 'proveedores', 'licencias', 'contratos', 'alertas', 'informes'],
    permisos: [
      { modulo: 'dashboard', accion: 'ver' },
      { modulo: 'inventario_servidores', accion: 'ver' },
      { modulo: 'inventario_cloud', accion: 'ver' },
      { modulo: 'inventario_fisico', accion: 'ver' },
      { modulo: 'proveedores', accion: 'ver' },
      { modulo: 'licencias', accion: 'ver' },
      { modulo: 'contratos', accion: 'ver' },
      { modulo: 'alertas', accion: 'ver' },
      { modulo: 'informes', accion: 'ver' },
    ]
  },
  {
    nombre: 'tecnico',
    descripcion: 'Técnico con acceso a inventario y monitor',
    esBase: true,
    modulos: ['dashboard', 'inventario_servidores', 'inventario_cloud', 'inventario_fisico', 'monitor', 'proveedores', 'licencias', 'contratos', 'alertas', 'seguridad', 'recursos', 'disponibilidad'],
    permisos: [
      { modulo: 'dashboard', accion: 'ver' },
      { modulo: 'inventario_servidores', accion: 'ver' },
      { modulo: 'inventario_servidores', accion: 'crear' },
      { modulo: 'inventario_servidores', accion: 'editar' },
      { modulo: 'inventario_servidores', accion: 'eliminar' },
      { modulo: 'inventario_servidores', accion: 'exportar' },
      { modulo: 'inventario_cloud', accion: 'ver' },
      { modulo: 'inventario_cloud', accion: 'crear' },
      { modulo: 'inventario_cloud', accion: 'editar' },
      { modulo: 'inventario_cloud', accion: 'eliminar' },
      { modulo: 'inventario_fisico', accion: 'ver' },
      { modulo: 'inventario_fisico', accion: 'crear' },
      { modulo: 'inventario_fisico', accion: 'editar' },
      { modulo: 'inventario_fisico', accion: 'eliminar' },
      { modulo: 'monitor', accion: 'ver' },
      { modulo: 'proveedores', accion: 'ver' },
      { modulo: 'proveedores', accion: 'crear' },
      { modulo: 'proveedores', accion: 'editar' },
      { modulo: 'licencias', accion: 'ver' },
      { modulo: 'licencias', accion: 'crear' },
      { modulo: 'licencias', accion: 'editar' },
      { modulo: 'contratos', accion: 'ver' },
      { modulo: 'contratos', accion: 'crear' },
      { modulo: 'contratos', accion: 'editar' },
      { modulo: 'alertas', accion: 'ver' },
      { modulo: 'seguridad', accion: 'ver' },
      { modulo: 'recursos', accion: 'ver' },
      { modulo: 'disponibilidad', accion: 'ver' },
    ]
  },
]

async function inicializarSistema() {
  console.log('🔄 Inicializando módulos, roles y permisos...\n')

  try {
    // 1. Crear módulos
    console.log('📦 Creando módulos...')
    for (const mod of modulosBase) {
      const existente = await prisma.modulo.findUnique({ where: { nombre: mod.nombre } })
      if (!existente) {
        const modulo = await prisma.modulo.create({
          data: {
            nombre: mod.nombre,
            descripcion: mod.descripcion,
            icono: mod.icono,
            orden: mod.orden,
            activo: true,
            permisos: {
              create: permisosBase.map(accion => ({ accion }))
            }
          },
          include: { permisos: true }
        })
        console.log(`  ✅ Módulo creado: ${mod.nombre}`)
      } else {
        console.log(`  ⏭️  Módulo ya existe: ${mod.nombre}`)
      }
    }

    // 2. Crear roles
    console.log('\n👥 Creando roles...')
    for (const rol of rolesBase) {
      const existente = await prisma.rol.findUnique({ where: { nombre: rol.nombre } })
      if (!existente) {
        // Obtener IDs de módulos
        const modulos = await prisma.modulo.findMany({
          where: { nombre: { in: rol.modulos } }
        })

        // Crear permisos del rol
        const permisos = rol.permisos.map(p => {
          const modulo = modulos.find(m => m.nombre === p.modulo)
          if (!modulo) return null
          return {
            moduloId: modulo.id,
            accion: p.accion
          }
        }).filter(Boolean)

        const rolCreado = await prisma.rol.create({
          data: {
            nombre: rol.nombre,
            descripcion: rol.descripcion,
            esBase: rol.esBase,
            roles: {
              create: modulos.map(m => ({ moduloId: m.id }))
            },
            permisos: {
              create: permisos as any
            }
          }
        })
        console.log(`  ✅ Rol creado: ${rol.nombre}`)
      } else {
        console.log(`  ⏭️  Rol ya existe: ${rol.nombre}`)
      }
    }

    // 3. Crear usuario admin si no existe
    console.log('\n👤 Verificando usuario admin...')
    const adminExistente = await prisma.user.findUnique({ 
      where: { email: 'admin@inventario.local' } 
    })
    
    if (!adminExistente) {
      const hashedPassword = await bcrypt.hash('admin123', 10)
      const rolAdmin = await prisma.rol.findUnique({ where: { nombre: 'admin' } })
      
      await prisma.user.create({
        data: {
          email: 'admin@inventario.local',
          password: hashedPassword,
          nombre: 'Administrador',
          rol: 'admin',
          activo: true,
          debeCambiarPass: false,
          usuarioRoles: {
            create: {
              rolId: rolAdmin!.id
            }
          }
        }
      })
      console.log('  ✅ Usuario admin creado: admin@inventario.local / admin123')
    } else {
      console.log('  ⏭️  Usuario admin ya existe')
    }

    console.log('\n✅ Sistema inicializado correctamente!')
    console.log('\n📋 Credenciales por defecto:')
    console.log('   Email: admin@inventario.local')
    console.log('   Password: admin123')
    console.log('\n📋 Roles disponibles:')
    for (const rol of rolesBase) {
      console.log(`   - ${rol.nombre}: ${rol.descripcion}`)
    }

  } catch (error) {
    console.error('\n❌ Error al inicializar:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

inicializarSistema()
