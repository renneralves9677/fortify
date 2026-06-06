import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { provisionDefaultTemplates } from '../src/modules/templates/templates-provision.repository.js';

const prisma = new PrismaClient();

const termsVersion = process.env.LEGAL_TERMS_VERSION ?? '1.0';
const privacyVersion = process.env.LEGAL_PRIVACY_VERSION ?? '1.0';

async function main() {
  const company = await prisma.company.upsert({
    where: { cnpj: '11444777000161' },
    update: {},
    create: { name: 'Demo Construtora Ltda', cnpj: '11444777000161' },
  });

  const passwordHash = await bcrypt.hash('demo123456', 10);
  const user = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: 'admin@demo.fortify.local' } },
    update: {},
    create: {
      companyId: company.id,
      email: 'admin@demo.fortify.local',
      name: 'Admin Demo',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  await prisma.userConsent.upsert({
    where: { userId: user.id },
    update: { termsVersion, privacyVersion },
    create: {
      userId: user.id,
      termsVersion,
      privacyVersion,
    },
  });

  await provisionDefaultTemplates(company.id, prisma, {
    updateExisting: ['CONTRATO DE PRESTAÇÃO DE SERVIÇOS'],
  });

  console.log('Seed OK — admin@demo.fortify.local / demo123456');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
