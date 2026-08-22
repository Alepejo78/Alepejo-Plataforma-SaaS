import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Corrige a razão social e o CNPJ da própria AlePejo, que foi cadastrada
 * na carga inicial com dados de exemplo e não tem tela pra editar (a de
 * Configurações → Empresa é do cliente, não da plataforma).
 *
 * Importa mais do que parece: é esse cadastro que vira o "fornecedor"
 * do título de contas a pagar da mensalidade em cada empresa cliente
 * (ver `syncFinancialEntry`), e é ele que identifica a plataforma nos
 * relatórios de faturamento.
 *
 *   npx ts-node prisma/scripts/atualizar-dados-alepejo.ts
 *       → mostra o que está gravado e o que mudaria.
 *
 *   npx ts-node prisma/scripts/atualizar-dados-alepejo.ts --aplicar
 *       → grava.
 */
const CODE = 'ALEPEJO';
const RAZAO_SOCIAL = 'AlePejo Assessoria e Prestação de Serviço Ltda';
const CNPJ = '68275303000150';

function formatarCnpj(doc: string) {
  return doc.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5',
  );
}

async function main() {
  const aplicar = process.argv.includes('--aplicar');

  const company = await prisma.company.findFirst({ where: { code: CODE } });

  if (!company) {
    console.log(`Nenhuma empresa com código ${CODE} neste banco.`);

    return;
  }

  console.log('\nAgora:');
  console.log(`  razão social: ${company.legalName}`);
  console.log(`  CNPJ:         ${formatarCnpj(company.document)}`);

  console.log('\nFicará:');
  console.log(`  razão social: ${RAZAO_SOCIAL}`);
  console.log(`  CNPJ:         ${formatarCnpj(CNPJ)}`);

  if (!aplicar) {
    console.log('\nNada foi gravado. Rode de novo com --aplicar\n');

    return;
  }

  // O CNPJ é único entre empresas: se outra já tiver esse número, é
  // melhor parar e avisar do que estourar erro de constraint.
  const conflito = await prisma.company.findFirst({
    where: { document: CNPJ, id: { not: company.id } },
    select: { code: true, legalName: true },
  });

  if (conflito) {
    console.log(
      `\nAbortado: o CNPJ já pertence à empresa ${conflito.code} — ${conflito.legalName}.\n`,
    );

    return;
  }

  await prisma.company.update({
    where: { id: company.id },
    data: { legalName: RAZAO_SOCIAL, document: CNPJ },
  });

  // O cadastro de fornecedor que as empresas clientes têm da AlePejo é
  // uma cópia feita na hora do primeiro título — atualiza junto pra não
  // ficar o nome velho no contas a pagar de quem já foi cobrado.
  const parceiros = await prisma.businessPartner.updateMany({
    where: { document: company.document },
    data: { legalName: RAZAO_SOCIAL, document: CNPJ },
  });

  console.log(
    `\nPronto. Empresa atualizada e ${parceiros.count} cadastro(s) de ` +
      `fornecedor nas empresas clientes.\n`,
  );
}

main()
  .catch((err) => {
    console.error('Falhou:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
