const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await prisma.user.upsert({
    where: { email: 'jorge.canel@grupoalmo.com' },
    update: {},
    create: {
      email: 'jorge.canel@grupoalmo.com',
      password: hashedPassword,
      nombre: 'Jorge Canel',
      rol: 'admin',
      activo: true
    }
  });
  
  console.log('Usuario admin creado correctamente');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
