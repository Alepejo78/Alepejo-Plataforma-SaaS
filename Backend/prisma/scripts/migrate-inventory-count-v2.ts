import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Converte as contagens de inventário criadas antes da versão com
 * várias rodadas (1/2/3) pros novos status. Roda uma vez por
 * ambiente (local, depois produção) — idempotente: rodar de novo não
 * muda nada, porque só mexe em registros ainda com status antigo
 * (DRAFT/FINALIZED) ou item ainda com status PENDING vindo do default.
 *
 * Regra:
 * - FINALIZED (significado antigo = já tinha ajustado o estoque) -> ADJUSTED.
 * - DRAFT com algum item já tendo countedQuantity1 -> COUNTING.
 * - DRAFT sem nenhum item contado -> OPEN.
 * - Item com countedQuantity1 preenchido -> status DONE (contagem
 *   antiga era de rodada única, já era tratada como valor final).
 */
async function main() {
  console.log('Convertendo contagens FINALIZED (antigas) para ADJUSTED...');

  const adjusted = await prisma.inventoryCount.updateMany({
    where: { status: 'FINALIZED' },
    data: { status: 'ADJUSTED' },
  });

  console.log(`  ${adjusted.count} contagem(ns) convertida(s) para ADJUSTED.`);

  console.log('Convertendo contagens DRAFT com item já contado para COUNTING...');

  const draftCounts = await prisma.inventoryCount.findMany({
    where: { status: 'DRAFT' },
    select: {
      id: true,
      items: { select: { countedQuantity1: true } },
    },
  });

  let toCounting = 0;
  let toOpen = 0;

  for (const count of draftCounts) {
    const hasReading = count.items.some(
      (item) => item.countedQuantity1 != null,
    );

    await prisma.inventoryCount.update({
      where: { id: count.id },
      data: { status: hasReading ? 'COUNTING' : 'OPEN' },
    });

    if (hasReading) {
      toCounting += 1;
    } else {
      toOpen += 1;
    }
  }

  console.log(`  ${toCounting} contagem(ns) convertida(s) para COUNTING.`);
  console.log(`  ${toOpen} contagem(ns) convertida(s) para OPEN.`);

  console.log('Marcando itens já contados como DONE...');

  const doneItems = await prisma.inventoryCountItem.updateMany({
    where: { status: 'PENDING', countedQuantity1: { not: null } },
    data: { status: 'DONE' },
  });

  console.log(`  ${doneItems.count} item(ns) marcado(s) como DONE.`);

  console.log('\nPronto.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
