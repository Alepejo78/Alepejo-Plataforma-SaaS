import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Apaga as empresas criadas em teste, deixando o ambiente limpo pra
 * uma nova rodada de testes de compra.
 *
 * Roda em duas etapas de propósito — apagar empresa é irreversível:
 *
 *   npx ts-node prisma/scripts/limpar-empresas-teste.ts
 *       → só LISTA o que existe e o que seria apagado.
 *
 *   npx ts-node prisma/scripts/limpar-empresas-teste.ts --apagar
 *       → apaga de verdade.
 *
 * Nunca toca nas empresas protegidas (`SEMPRE_MANTER`), que é onde
 * mora o dono da plataforma. Pra poupar outras, passe os códigos
 * separados por vírgula:
 *
 *   ... --apagar --manter=ACME,FILIAL01
 *
 * Junto vão os usuários de cada empresa (a FK de `users` é Restrict,
 * então precisam sair antes) e as compras iniciadas e não concluídas
 * (`PendingCheckout`), que não têm vínculo de banco com a empresa e
 * ficariam órfãs segurando um pagamento de teste.
 */
const SEMPRE_MANTER = ['ALEPEJO'];

function normalizar(code: string) {
  return code.trim().toUpperCase();
}

async function main() {
  const args = process.argv.slice(2);
  const apagar = args.includes('--apagar');

  const manterExtra = (
    args.find((a) => a.startsWith('--manter='))?.split('=')[1] ?? ''
  )
    .split(',')
    .map(normalizar)
    .filter(Boolean);

  const manter = new Set([...SEMPRE_MANTER, ...manterExtra]);

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      companyPlan: { include: { plan: { select: { name: true } } } },
      _count: { select: { users: true } },
    },
  });

  const paraApagar = companies.filter(
    (c) => !manter.has(normalizar(c.code)),
  );

  console.log(`\n${companies.length} empresa(s) no banco:\n`);

  for (const c of companies) {
    const sorte = manter.has(normalizar(c.code)) ? 'MANTÉM' : 'APAGA ';
    const plano = c.companyPlan?.plan?.name ?? 'sem plano';
    const criada = c.createdAt.toLocaleDateString('pt-BR');

    console.log(
      `  [${sorte}] ${c.code.padEnd(14)} ${c.legalName.padEnd(38)} ` +
        `doc ${c.document.padEnd(16)} ${plano.padEnd(20)} ` +
        `${c._count.users} usuário(s)  criada em ${criada}`,
    );
  }

  const checkouts = await prisma.pendingCheckout.count();

  console.log(
    `\n${paraApagar.length} empresa(s) a apagar e ${checkouts} compra(s) ` +
      `iniciada(s) sem cadastro concluído.`,
  );

  if (!apagar) {
    console.log(
      '\nNada foi apagado. Confira a lista acima e, se estiver certa, ' +
        'rode de novo com --apagar\n',
    );

    return;
  }

  for (const c of paraApagar) {
    // Usuários primeiro: a FK é Restrict e barraria a exclusão da
    // empresa. Todo o resto (módulos, plano, cadastros, movimentos)
    // sai em cascata junto com ela.
    const users = await prisma.user.deleteMany({
      where: { companyId: c.id },
    });

    await prisma.company.delete({ where: { id: c.id } });

    console.log(
      `apagada: ${c.code} — ${c.legalName} (${users.count} usuário(s))`,
    );
  }

  const limpos = await prisma.pendingCheckout.deleteMany({});

  console.log(
    `\nPronto: ${paraApagar.length} empresa(s) e ${limpos.count} ` +
      `compra(s) pendente(s) removidas.\n`,
  );
}

main()
  .catch((err) => {
    console.error('Falhou:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
