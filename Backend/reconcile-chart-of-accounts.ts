import { PrismaClient } from '@prisma/client';
import { DEFAULT_CHART_OF_ACCOUNTS } from './src/core/default-accounting/default-accounting.constants';

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findUniqueOrThrow({ where: { code: 'ALEPEJO' } });
  const newCodes = new Map(DEFAULT_CHART_OF_ACCOUNTS.map((a) => [a.code, a]));

  const accounts = await prisma.chartOfAccount.findMany({
    where: { companyId: company.id },
    include: {
      classification: true,
      _count: {
        select: {
          financialEntries: true,
          purchases: true,
          sales: true,
          purchaseOrders: true,
          salesOrders: true,
          quotes: true,
          products: true,
          productsForSale: true,
        },
      },
    },
  });

  let deleted = 0;
  let deactivated = 0;
  let keptCompatible = 0;
  const conflicts: string[] = [];

  for (const acc of accounts) {
    const refCount = Object.values(acc._count).reduce((a, b) => a + b, 0);
    const newEntry = newCodes.get(acc.code);
    const isCompatible =
      !!newEntry &&
      newEntry.description === acc.description &&
      newEntry.classification === acc.classification.name;

    if (isCompatible) {
      keptCompatible++;
      continue;
    }

    if (refCount === 0) {
      await prisma.chartOfAccount.delete({ where: { id: acc.id } });
      deleted++;
    } else {
      if (acc.active) {
        await prisma.chartOfAccount.update({ where: { id: acc.id }, data: { active: false } });
      }
      deactivated++;
      if (newEntry) {
        conflicts.push(
          `${acc.code} (${acc.description}) tem ${refCount} referência(s) — não deu pra liberar o código pro novo "${newEntry.description}"`,
        );
      }
    }
  }

  const classifications = await prisma.chartOfAccountClassification.findMany({
    where: { companyId: company.id },
    include: { _count: { select: { accounts: true } } },
  });
  let classificationsDeleted = 0;
  for (const c of classifications) {
    if (c._count.accounts === 0) {
      await prisma.chartOfAccountClassification.delete({ where: { id: c.id } });
      classificationsDeleted++;
    }
  }

  console.log(
    JSON.stringify({ deleted, deactivated, keptCompatible, classificationsDeleted, conflicts }, null, 2),
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
