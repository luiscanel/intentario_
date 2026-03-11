const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Usar variables de entorno o valores por defecto
  const email = process.env.ADMIN_EMAIL || 'jorge.canel@grupoalmo.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  // Verificar si ya existe
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    console.log('El usuario ya existe:', existingUser.email);
    return;
  }

  // Hashear contraseña
  const hashedPassword = await bcrypt.hash(password, 10);

  // Crear usuario admin
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      nombre: 'Administrador',
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
