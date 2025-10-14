// Enkel seed i CommonJS så den virker uden TS/ESM-opsætning
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Idempotent seed: skaber en bruger hvis ikke findes
  const email = 'admin@example.com';
  const existing = await prisma.user.findUnique({ where: { email } }).catch(() => null);
  if (!existing) {
    await prisma.user.create({
      data: { email, name: 'Admin' }
    });
    console.log('Seeded User:', email);
  } else {
    console.log('User already exists:', email);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
