import { PrismaClient } from '@prisma/client';
import {
  SYSTEM_EXPENSE_ACCOUNT_CODE,
  SYSTEM_EXPENSE_ACCOUNT_CLASSIFICATION,
  SYSTEM_EXPENSE_ACCOUNT_DESCRIPTION,
} from './src/core/default-accounting/default-accounting.constants';

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findUniqueOrThrow({ where: { code: 'ALEPEJO' } });

  const account = await prisma.chartOfAccount.findFirst({
    where: { companyId: company.id, code: SYSTEM_EXPENSE_ACCOUNT_CODE },
  });

  if (!account) {
    console.log('nenhuma conta em', SYSTEM_EXPENSE_ACCOUNT_CODE, '— nada a fazer');
    await prisma.$disconnect();
    return;
  }

  const classification = await prisma.chartOfAccountClassification.upsert({
    where: { companyId_name: { companyId: company.id, name: SYSTEM_EXPENSE_ACCOUNT_CLASSIFICATION } },
    update: { active: true },
    create: { companyId: company.id, name: SYSTEM_EXPENSE_ACCOUNT_CLASSIFICATION, active: true },
  });

  const updated = await prisma.chartOfAccount.update({
    where: { id: account.id },
    data: {
      classificationId: classification.id,
      description: SYSTEM_EXPENSE_ACCOUNT_DESCRIPTION,
      active: true,
    },
  });

  console.log('conta', SYSTEM_EXPENSE_ACCOUNT_CODE, 'atualizada:', JSON.stringify(updated, null, 2));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
