const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Crear módulos
  const modulos = [
    { nombre: 'Inventario', descripcion: 'Gestión de inventario', icono: 'inventory', orden: 1 },
    { nombre: 'Servidores', descripcion: 'Gestión de servidores', icono: 'server', orden: 2 },
    { nombre: 'Contratos', descripcion: 'Gestión de contratos', icono: 'contract', orden: 3 },
    { nombre: 'Licencias', descripcion: 'Gestión de licencias', icono: 'license', orden: 4 },
    { nombre: 'Certificados', descripcion: 'Gestión de certificados SSL', icono: 'certificate', orden: 5 },
    { nombre: 'Proveedores', descripcion: 'Gestión de proveedores', icono: 'provider', orden: 6 },
    { nombre: 'Cambios', descripcion: 'Gestión de cambios', icono: 'change', orden: 7 },
    { nombre: 'Backups', descripcion: 'Gestión de backups', icono: 'backup', orden: 8 },
    { nombre: 'Costos Cloud', descripcion: 'Costos de servicios cloud', icono: 'cloud', orden: 9 },
    { nombre: 'Alertas', descripcion: 'Sistema de alertas', icono: 'alert', orden: 10 },
    { nombre: 'Reportes', descripcion: 'Reportes y estadísticas', icono: 'report', orden: 11 },
    { nombre: 'Configuración', descripcion: 'Configuración del sistema', icono: 'settings', orden: 12 },
  ];

  for (const mod of modulos) {
    await prisma.modulo.upsert({
      where: { nombre: mod.nombre },
      update: {},
      create: mod,
    });
  }

  // Crear rol admin
  const rolAdmin = await prisma.rol.upsert({
    where: { nombre: 'admin' },
    update: {},
    create: { nombre: 'admin', descripcion: 'Administrador', esBase: true },
  });

  // Asignar todos los módulos al rol admin
  const modulosCreados = await prisma.modulo.findMany();
  for (const mod of modulosCreados) {
    await prisma.rolModulo.upsert({
      where: { rolId_moduloId: { rolId: rolAdmin.id, moduloId: mod.id } },
      update: {},
      create: { rolId: rolAdmin.id, moduloId: mod.id },
    });

    // Crear permisos para cada módulo
    const acciones = ['ver', 'crear', 'editar', 'eliminar', 'exportar'];
    for (const accion of acciones) {
      await prisma.permiso.create({
        data: { moduloId: mod.id, accion, rolId: rolAdmin.id },
      }).catch(() => {}); // Ignorar si ya existe
    }
  }

  // Asignar rol admin al usuario
  await prisma.usuarioRol.upsert({
    where: { usuarioId_rolId: { usuarioId: 1, rolId: rolAdmin.id } },
    update: {},
    create: { usuarioId: 1, rolId: rolAdmin.id },
  });

  console.log('Seed completado: módulos, rol admin y permisos creados');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
