import { PrismaClient } from '@prisma/client';

import {
  DEFAULT_CHART_OF_ACCOUNTS,
  DEFAULT_UNIT_CODE,
  DEFAULT_UNIT_DESCRIPTION,
  SYSTEM_EXPENSE_ACCOUNT_CLASSIFICATION,
  SYSTEM_EXPENSE_ACCOUNT_CODE,
  SYSTEM_EXPENSE_ACCOUNT_DESCRIPTION,
  SYSTEM_EXPENSE_PRODUCT_CODE,
  SYSTEM_EXPENSE_PRODUCT_DESCRIPTION,
} from '../../src/core/default-accounting/default-accounting.constants';
import { PLATFORM_COMPANY_CODE } from '../../src/core/constants/platform.constants';

const prisma = new PrismaClient();

/**
 * Acerto (backfill) das empresas que já existiam antes do plano de
 * contas padrão virar cadastro automático de empresa nova
 * (CompanyOnboardingService.seedDefaultAccounting, 31-08-2026).
 *
 * Pra cada empresa (exceto a própria ALEPEJO):
 *  1. Migra a conta "01.01.01" antiga, se existir com o nome errado
 *     ("Despesas com Sistema"), pra classificação "Sistemas" /
 *     descrição "Despesas com sistema ERP" — SEM apagar nada, só
 *     renomeia (ou reponta a classificação, se ela for compartilhada
 *     com outras contas que o cliente já cadastrou).
 *  2. Garante a presença das 42 contas / 6 classificações / 1 unidade
 *     / 1 produto padrão — idempotente (find-or-create): já existir
 *     com esse código, não duplica nem sobrescreve o que o cliente já
 *     tiver editado.
 *
 * NUNCA apaga nada que a empresa já tenha cadastrado.
 *
 * Rodar sempre com --dry-run primeiro (só loga o que faria, não grava).
 *
 * Uso (depois que o deploy do Railway concluir — nunca rodar migração
 * contra produção antes da linha "Applying migration" aparecer):
 *   npx ts-node prisma/scripts/backfill-default-accounting.ts --dry-run
 *   npx ts-node prisma/scripts/backfill-default-accounting.ts
 */

const LEGACY_SYSTEM_ACCOUNT_NAME = 'Despesas com Sistema';

/** Empresas em que o código "0001" já existe com outro sentido — reportadas no fim, não mexidas por este script. */
const attentionNeeded: { legalName: string; code: string }[] = [];

const DRY_RUN = process.argv.includes('--dry-run');

async function migrateLegacySystemAccount(companyId: string): Promise<void> {
  const account = await prisma.chartOfAccount.findFirst({
    where: { companyId, code: SYSTEM_EXPENSE_ACCOUNT_CODE },
    include: { classification: true },
  });

  if (!account) {
    return;
  }

  const looksLegacy =
    account.classification.name === LEGACY_SYSTEM_ACCOUNT_NAME ||
    account.description === LEGACY_SYSTEM_ACCOUNT_NAME;

  if (!looksLegacy) {
    return;
  }

  console.log(
    `  · Migrando conta ${SYSTEM_EXPENSE_ACCOUNT_CODE} (classificação "${account.classification.name}") pra "${SYSTEM_EXPENSE_ACCOUNT_CLASSIFICATION}" / "${SYSTEM_EXPENSE_ACCOUNT_DESCRIPTION}".`,
  );

  if (DRY_RUN) {
    return;
  }

  const siblingCount = await prisma.chartOfAccount.count({
    where: {
      classificationId: account.classificationId,
      id: { not: account.id },
    },
  });

  let classificationId = account.classificationId;

  if (siblingCount === 0) {
    // Classificação usada só por esta conta — pode renomear em vez de
    // criar uma nova (evita ficar com uma classificação órfã "Despesas
    // com Sistema" sem nenhuma conta dentro).
    await prisma.chartOfAccountClassification.update({
      where: { id: account.classificationId },
      data: { name: SYSTEM_EXPENSE_ACCOUNT_CLASSIFICATION },
    });
  } else {
    // A classificação antiga tem outras contas que o cliente já
    // cadastrou — não mexe nela, só reponta esta conta pra "Sistemas".
    const sistemas = await prisma.chartOfAccountClassification.upsert({
      where: {
        companyId_name: {
          companyId,
          name: SYSTEM_EXPENSE_ACCOUNT_CLASSIFICATION,
        },
      },
      update: {},
      create: { companyId, name: SYSTEM_EXPENSE_ACCOUNT_CLASSIFICATION },
    });

    classificationId = sistemas.id;
  }

  await prisma.chartOfAccount.update({
    where: { id: account.id },
    data: {
      classificationId,
      description: SYSTEM_EXPENSE_ACCOUNT_DESCRIPTION,
    },
  });
}

async function seedDefaultAccountingFor(
  companyId: string,
  company: { legalName: string; code: string },
): Promise<void> {
  const classificationIds = new Map<string, string>();

  for (const entry of DEFAULT_CHART_OF_ACCOUNTS) {
    if (DRY_RUN) {
      continue;
    }

    let classificationId = classificationIds.get(entry.classification);

    if (!classificationId) {
      const classification = await prisma.chartOfAccountClassification.upsert(
        {
          where: {
            companyId_name: { companyId, name: entry.classification },
          },
          update: {},
          create: { companyId, name: entry.classification },
        },
      );

      classificationId = classification.id;
      classificationIds.set(entry.classification, classificationId);
    }

    await prisma.chartOfAccount.upsert({
      where: { companyId_code: { companyId, code: entry.code } },
      update: {},
      create: {
        companyId,
        code: entry.code,
        classificationId,
        description: entry.description,
        type: 'DESPESA',
      },
    });
  }

  if (DRY_RUN) {
    return;
  }

  const unit = await prisma.unitOfMeasure.upsert({
    where: { companyId_code: { companyId, code: DEFAULT_UNIT_CODE } },
    update: {},
    create: {
      companyId,
      code: DEFAULT_UNIT_CODE,
      description: DEFAULT_UNIT_DESCRIPTION,
      active: true,
    },
  });

  const existingProduct = await prisma.product.findFirst({
    where: { companyId, code: SYSTEM_EXPENSE_PRODUCT_CODE },
  });

  if (!existingProduct) {
    await prisma.product.create({
      data: {
        companyId,
        code: SYSTEM_EXPENSE_PRODUCT_CODE,
        description: SYSTEM_EXPENSE_PRODUCT_DESCRIPTION,
        type: 'SERVICE',
        inventoryControl: 'NONE',
        unitId: unit.id,
        salePrice: 0,
      },
    });
    return;
  }

  // Código "0001" pode ser coincidência: é o primeiro código natural
  // de qualquer catálogo, o cliente pode ter cadastrado o produto dele
  // com esse mesmo código antes deste backfill existir. Só reaproveita
  // se for MESMO o produto do sistema (tipo/descrição batendo) — senão
  // não mexe (não sobrescreve, não duplica com código conflitante) e
  // reporta pra revisão manual.
  const isSystemProduct =
    existingProduct.type === 'SERVICE' &&
    existingProduct.description === SYSTEM_EXPENSE_PRODUCT_DESCRIPTION;

  if (!isSystemProduct) {
    console.log(
      `  · ATENÇÃO: produto "${SYSTEM_EXPENSE_PRODUCT_CODE}" já existe nesta empresa com outro sentido (tipo "${existingProduct.type}", descrição "${existingProduct.description}") — não mexi, precisa de revisão manual.`,
    );
    attentionNeeded.push(company);
  }
}

async function main() {
  console.log(
    DRY_RUN
      ? 'Rodando em --dry-run (nada será gravado, só o log).'
      : 'Rodando de verdade — gravando no banco.',
  );

  const companies = await prisma.company.findMany({
    where: { code: { not: PLATFORM_COMPANY_CODE }, deletedAt: null },
    select: { id: true, legalName: true, code: true },
    orderBy: { legalName: 'asc' },
  });

  console.log(`${companies.length} empresa(s) a acertar (exceto ALEPEJO).`);

  for (const company of companies) {
    console.log(`\n${company.legalName} (${company.code})`);

    await migrateLegacySystemAccount(company.id);
    await seedDefaultAccountingFor(company.id, company);
  }

  if (attentionNeeded.length > 0) {
    console.log(
      `\n${attentionNeeded.length} empresa(s) com o código "${SYSTEM_EXPENSE_PRODUCT_CODE}" já usado por um produto do próprio cliente — revisar manualmente:`,
    );
    for (const company of attentionNeeded) {
      console.log(`  · ${company.legalName} (${company.code})`);
    }
  }

  console.log('\nConcluído.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
