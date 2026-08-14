import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Reconcilia cadastros que viram registro único por grupo ("Interprise")
 * — mesma raiz (Company.rootCompanyId ?? id) — depois que o código
 * passa a servir esses módulos por rootCompanyId em vez da empresa
 * ativa da sessão (ver docs/08-Continuidade.md, frente "Interprise").
 *
 * Nunca apaga nem mescla nada sozinho: repontar a linha de uma
 * filial para a raiz é seguro (o `id` não muda, nenhuma FK quebra);
 * quando já existe uma linha da raiz com o mesmo valor único, a linha
 * da filial é repontada mesmo assim, mas com o campo único sufixado —
 * fica como duplicata visível pra revisão humana decidir depois.
 *
 * Rodar sempre com --dry-run primeiro (só gera o log, não grava nada).
 * Idempotente: rodar de novo depois que já consolidou não faz nada
 * (linha já está com companyId da raiz, é ignorada).
 *
 * Adicionar aqui um `ConsolidationConfig` por tabela, na mesma ordem
 * em que o controller correspondente passa a usar
 * @CurrentUser('rootCompanyId') em vez de @CurrentUser('companyId')
 * (ver plano da frente "Interprise").
 */

interface ConsolidationConfig {
  label: string;
  /** Nome do delegate no Prisma Client (ex.: prisma.warehouse -> "warehouse"). */
  model: string;
  /** Campo com @@unique([companyId, <uniqueField>]) nessa tabela. */
  uniqueField: string;
}

const CONFIGS: ConsolidationConfig[] = [
  { label: 'Depósitos', model: 'warehouse', uniqueField: 'code' },
  {
    label: 'Classificações do Plano de Contas',
    model: 'chartOfAccountClassification',
    uniqueField: 'name',
  },
  { label: 'Setores', model: 'sector', uniqueField: 'name' },
  { label: 'Tipos de EPI', model: 'ppeType', uniqueField: 'name' },
  {
    label: 'Categorias de Produto',
    model: 'productCategory',
    uniqueField: 'name',
  },
  { label: 'Marcas', model: 'brand', uniqueField: 'name' },
  {
    label: 'Unidades de Medida',
    model: 'unitOfMeasure',
    uniqueField: 'code',
  },
  { label: 'Plano de Contas', model: 'chartOfAccount', uniqueField: 'code' },
  { label: 'Horários', model: 'workSchedule', uniqueField: 'name' },
  {
    label: 'Parceiros',
    model: 'businessPartner',
    uniqueField: 'document',
  },
  { label: 'Funções/Cargos', model: 'jobFunction', uniqueField: 'name' },
  // Product fica de fora por enquanto (Fase 3 do plano — cost/currentStock
  // precisam de decisão de schema antes de entrar aqui).
];

const DRY_RUN = process.argv.includes('--dry-run');

interface LogEntry {
  table: string;
  rowId: string;
  fromCompany: string;
  toCompany: string;
  originalValue: string;
  finalValue: string;
  renamed: boolean;
}

async function consolidateForGroup(
  config: ConsolidationConfig,
  root: { id: string; legalName: string },
  companyIds: string[],
  log: LogEntry[],
) {
  const delegate = (prisma as any)[config.model];

  const rows: any[] = await delegate.findMany({
    where: { companyId: { in: companyIds } },
  });

  if (rows.length === 0) {
    return;
  }

  const rootValues = new Set(
    rows
      .filter((row) => row.companyId === root.id)
      .map((row) => String(row[config.uniqueField])),
  );

  for (const row of rows) {
    if (row.companyId === root.id) {
      continue;
    }

    const originalValue = String(row[config.uniqueField]);
    let finalValue = originalValue;
    let renamed = false;

    if (rootValues.has(finalValue)) {
      finalValue = `${originalValue} (duplicado - revisar)`;
      renamed = true;
    }

    rootValues.add(finalValue);

    log.push({
      table: config.label,
      rowId: row.id,
      fromCompany: row.companyId,
      toCompany: root.id,
      originalValue,
      finalValue,
      renamed,
    });

    if (!DRY_RUN) {
      await delegate.update({
        where: { id: row.id },
        data: {
          companyId: root.id,
          [config.uniqueField]: finalValue,
        },
      });
    }
  }
}

/**
 * WorkScheduleShift não tem @@unique próprio (é sempre único dentro do
 * seu workScheduleId, não por nome/código) — em vez de reconciliar por
 * valor único, só espelha o companyId que o WorkSchedule pai já tiver
 * depois da consolidação (senão o turno fica "órfão", com companyId
 * antigo enquanto o horário já é da raiz).
 */
async function syncWorkScheduleShifts(
  rootId: string,
  companyIds: string[],
  log: LogEntry[],
) {
  const schedules = await prisma.workSchedule.findMany({
    where: { companyId: rootId },
    select: { id: true },
  });

  for (const schedule of schedules) {
    const shifts = await prisma.workScheduleShift.findMany({
      where: {
        workScheduleId: schedule.id,
        companyId: { in: companyIds, not: rootId },
      },
      select: { id: true, companyId: true },
    });

    for (const shift of shifts) {
      log.push({
        table: 'Turnos de horário',
        rowId: shift.id,
        fromCompany: shift.companyId,
        toCompany: rootId,
        originalValue: '(sem campo único, espelha o horário pai)',
        finalValue: '(sem campo único, espelha o horário pai)',
        renamed: false,
      });

      if (!DRY_RUN) {
        await prisma.workScheduleShift.update({
          where: { id: shift.id },
          data: { companyId: rootId },
        });
      }
    }
  }
}

async function main() {
  console.log(
    DRY_RUN
      ? 'Rodando em --dry-run (nada será gravado, só o log).'
      : 'Rodando de verdade — gravando no banco.',
  );

  const roots = await prisma.company.findMany({
    where: { rootCompanyId: null },
    select: { id: true, legalName: true },
  });

  const log: LogEntry[] = [];

  for (const root of roots) {
    const siblings = await prisma.company.findMany({
      where: { rootCompanyId: root.id },
      select: { id: true },
    });

    if (siblings.length === 0) {
      continue;
    }

    const companyIds = [root.id, ...siblings.map((s) => s.id)];

    for (const config of CONFIGS) {
      await consolidateForGroup(config, root, companyIds, log);
    }

    // Roda depois dos CONFIGS: precisa que WorkSchedule já esteja
    // consolidado pra saber quais horários já são da raiz.
    await syncWorkScheduleShifts(root.id, companyIds, log);
  }

  console.log(`${log.length} linha(s) reponta(s) pra raiz do grupo.`);

  const renamedCount = log.filter((entry) => entry.renamed).length;

  if (renamedCount > 0) {
    console.log(
      `${renamedCount} delas tiveram o valor sufixado por colisão de duplicata — revisar manualmente.`,
    );
  }

  if (log.length > 0) {
    const outputDir = path.join(__dirname, 'output');
    fs.mkdirSync(outputDir, { recursive: true });

    const outputPath = path.join(
      outputDir,
      `group-consolidation-${Date.now()}.json`,
    );

    fs.writeFileSync(outputPath, JSON.stringify(log, null, 2));
    console.log(`Log gravado em ${outputPath}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
