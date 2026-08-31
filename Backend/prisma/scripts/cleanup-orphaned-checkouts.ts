/**
 * Remove `PendingCheckout` órfãos — registros de compra cujo
 * `companyId` aponta pra uma empresa que já foi excluída (pelo
 * `CompanyDeletionService`, antes deste script existir, esses
 * registros não eram limpos junto — ver correção em
 * `company-deletion.service.ts`, 31-08-2026).
 *
 * Um `PendingCheckout` órfão trava a exclusão do `Plan` dele
 * (`onDelete: Restrict`) mesmo sem nenhuma empresa de verdade usando
 * o plano.
 *
 * Uso:
 *   npx ts-node prisma/scripts/cleanup-orphaned-checkouts.ts --dry-run
 *   npx ts-node prisma/scripts/cleanup-orphaned-checkouts.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

async function main() {
  const checkouts = await prisma.pendingCheckout.findMany({
    where: { companyId: { not: null } },
    select: { id: true, companyId: true, document: true, name: true, planId: true },
  });

  const orphaned: typeof checkouts = [];

  for (const checkout of checkouts) {
    const company = await prisma.company.findUnique({
      where: { id: checkout.companyId! },
      select: { id: true },
    });

    if (!company) {
      orphaned.push(checkout);
    }
  }

  if (orphaned.length === 0) {
    console.log('Nenhum PendingCheckout órfão encontrado.');
    return;
  }

  console.log(`${orphaned.length} PendingCheckout(s) órfão(s) encontrado(s):`);
  for (const checkout of orphaned) {
    console.log(
      `  - ${checkout.id} (${checkout.name}, doc ${checkout.document}, plano ${checkout.planId})`,
    );
  }

  if (dryRun) {
    console.log('\n--dry-run: nada foi apagado.');
    return;
  }

  const result = await prisma.pendingCheckout.deleteMany({
    where: { id: { in: orphaned.map((c) => c.id) } },
  });

  console.log(`\n${result.count} registro(s) removido(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
