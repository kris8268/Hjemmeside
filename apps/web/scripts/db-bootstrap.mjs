// scripts/db-bootstrap.mjs
// Kør fra apps/web: `pnpm exec node scripts/db-bootstrap.mjs`
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd(); // forventes at være apps/web
const rel = (p) => path.relative(ROOT, p);

const prismaDir = path.join(ROOT, 'prisma');
const scriptsDir = path.join(ROOT, 'scripts');
fs.mkdirSync(prismaDir, { recursive: true });
fs.mkdirSync(scriptsDir, { recursive: true });

const ensureFile = (filePath, content) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content.replace(/^\n+/, ''), 'utf8');
    console.log('Created', rel(filePath));
  } else {
    console.log('Exists ', rel(filePath));
  }
};

// schema.prisma (kun hvis mangler)
const schemaPath = path.join(prismaDir, 'schema.prisma');
const schemaContent = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`;
ensureFile(schemaPath, schemaContent);

// seed.cjs (kun hvis mangler)
const seedPath = path.join(prismaDir, 'seed.cjs');
const seedContent = `const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const email = 'admin@example.com';
  const existing = await prisma.user.findUnique({ where: { email } }).catch(() => null);
  if (!existing) {
    await prisma.user.create({ data: { email, name: 'Admin' } });
    console.log('Seeded User:', email);
  } else {
    console.log('User already exists:', email);
  }
}
main().catch((e)=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
`;
ensureFile(seedPath, seedContent);

// .env.example
const envExamplePath = path.join(ROOT, '.env.example');
const envExample = `# Kopiér til .env og indsæt dine rigtige værdier
# Husk at URL-encode password (fx + -> %2B)
DATABASE_URL="postgresql://postgres.<PROJECT-REF>:ENCODED_PASSWORD@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
DIRECT_URL="postgresql://postgres.<PROJECT-REF>:ENCODED_PASSWORD@aws-1-eu-north-1.pooler.supabase.com:5432/postgres?sslmode=require"
`;
ensureFile(envExamplePath, envExample);

// .gitignore (tilføj linjer hvis de ikke findes)
const giPath = path.join(ROOT, '.gitignore');
const giLines = [
  'node_modules',
  '.env',
  '.env.*.local',
  '.DS_Store',
  '.prisma/',
  'pnpm-lock.yaml'
];
let gi = '';
if (fs.existsSync(giPath)) gi = fs.readFileSync(giPath, 'utf8');
let added = 0;
for (const l of giLines) {
  if (!gi.includes(l)) {
    gi += (gi.endsWith('\n') ? '' : '\n') + l + '\n';
    added++;
  }
}
fs.writeFileSync(giPath, gi, 'utf8');
console.log(added ? `Updated ${rel(giPath)} (+${added} lines)` : `Exists  ${rel(giPath)}`);

// Opdater package.json scripts
const pkgPath = path.join(ROOT, 'package.json');
if (!fs.existsSync(pkgPath)) {
  console.error('package.json ikke fundet i', ROOT);
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.scripts = pkg.scripts ?? {};
pkg.scripts.prisma = pkg.scripts.prisma ?? 'prisma';
pkg.scripts['db:pull'] = pkg.scripts['db:pull'] ?? 'prisma db pull';
pkg.scripts['db:migrate'] = pkg.scripts['db:migrate'] ?? 'prisma migrate dev';
pkg.scripts['db:generate'] = pkg.scripts['db:generate'] ?? 'prisma generate';
pkg.scripts['db:deploy'] = pkg.scripts['db:deploy'] ?? 'prisma migrate deploy';
pkg.scripts['db:seed'] = pkg.scripts['db:seed'] ?? 'node prisma/seed.cjs';
pkg.scripts['db:studio'] = pkg.scripts['db:studio'] ?? 'prisma studio';
pkg.scripts['db:setup'] = pkg.scripts['db:setup'] ?? 'node scripts/db-bootstrap.mjs && prisma migrate dev --name init && prisma generate && node prisma/seed.cjs';
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log('Updated package.json scripts');

console.log('\nAlt klart ✅');
