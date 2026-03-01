const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = 'jorge.canel@grupoalmo.com';
  const password = 'admin123'; // Cambiar en producción

  // Verificar si ya existe
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    console.log('El usuario ya existe:', existingUser.email);
    return;
  }

  // Crear usuario admin
  const user = await prisma.user.create({
    data: {
      email,
      password, // En producción usar hash: bcrypt.hash(password, 10)
      nombre: 'Jorge Canel',
      rol: 'admin',
      activo: true,
      debeCambiarPass: false
    }
  });

  console.log('Usuario administrador creado:', user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
