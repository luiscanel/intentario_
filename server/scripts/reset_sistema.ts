import { prisma } from '../src/prisma/index'
import bcrypt from 'bcryptjs'

async function limpiarYInicializar() {
  console.log('🔄 Limpiando datos existentes...\n')

  try {
    // Limpiar relaciones
    await prisma.usuarioRol.deleteMany({})
    await prisma.rolModulo.deleteMany({})
    await prisma.permiso.deleteMany({})
    await prisma.rol.deleteMany({})
    await prisma.modulo.deleteMany({})
    await prisma.user.deleteMany({})

    console.log('✅ Datos limpiados\n')

    // Módulos base
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

    const permisosBase = ['ver', 'crear', 'editar', 'eliminar', 'exportar']

    // Crear módulos
    console.log('📦 Creando módulos...')
    const modulosCreados: Record<string, number> = {}
    for (const mod of modulosBase) {
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
      modulosCreados[mod.nombre] = modulo.id
      console.log(`  ✅ ${mod.nombre}`)
    }

    // Roles
    const rolesData = [
      {
        nombre: 'admin',
        descripcion: 'Administrador con acceso completo',
        modulos: modulosBase.map(m => m.nombre),
        permisos: modulosBase.flatMap(m => permisosBase.map(p => ({ modulo: m.nombre, accion: p })))
      },
      {
        nombre: 'usuario',
        descripcion: 'Usuario básico con acceso de solo lectura',
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

    console.log('\n👥 Creando roles...')
    for (const rol of rolesData) {
      const rolCreado = await prisma.rol.create({
        data: {
          nombre: rol.nombre,
          descripcion: rol.descripcion,
          esBase: true,
          roles: {
            create: rol.modulos.map(m => ({ moduloId: modulosCreados[m] }))
          },
          permisos: {
            create: rol.permisos.map(p => ({ moduloId: modulosCreados[p.modulo], accion: p.accion }))
          }
        }
      })
      console.log(`  ✅ ${rol.nombre}`)
    }

    // Crear admin
    console.log('\n👤 Creando usuario admin...')
    const hashedPassword = await bcrypt.hash('admin123', 10)
    const rolAdmin = await prisma.rol.findUnique({ where: { nombre: 'admin' } })
    
    await prisma.user.create({
      data: {
        email: 'admin@grupoalmo.com',
        password: hashedPassword,
        nombre: 'Administrador',
        rol: 'admin',
        activo: true,
        debeCambiarPass: false,
        usuarioRoles: {
          create: { rolId: rolAdmin!.id }
        }
      }
    })
    console.log('  ✅ admin@grupoalmo.com')

    console.log('\n✅ Sistema inicializado correctamente!')
    console.log('\n📋 Credenciales:')
    console.log('   Email: admin@inventario.local')
    console.log('   Password: admin123')

  } catch (error) {
    console.error('\n❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

limpiarYInicializar()
