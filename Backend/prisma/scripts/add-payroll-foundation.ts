import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Backfill da Fase 1 do módulo de Folha de Pagamento no banco já
 * existente (mesmo padrão de add-quote-approve-permission.ts): cria
 * o grupo de permissões "PAYROLL" + concede ao Administrador, e
 * cadastra a tabela de INSS/IRRF/FGTS vigente em 2026 pra cada
 * empresa raiz (grupo econômico) que ainda não tiver nenhuma.
 */

const PAYROLL_PERMISSIONS: { code: string; name: string }[] = [
  {
    code: 'payroll-tax-table.view',
    name: 'Consultar Parâmetros Fiscais (INSS/IRRF/FGTS)',
  },
  {
    code: 'payroll-tax-table.manage',
    name: 'Alterar Parâmetros Fiscais (INSS/IRRF/FGTS)',
  },
  { code: 'payroll-settings.view', name: 'Consultar Configurações da Folha' },
  { code: 'payroll-settings.manage', name: 'Alterar Configurações da Folha' },
];

async function ensurePermissions() {
  const group = await prisma.permissionGroup.upsert({
    where: { code: 'PAYROLL' },
    update: { name: 'Folha de Pagamento' },
    create: { code: 'PAYROLL', name: 'Folha de Pagamento' },
  });

  const permissionIds: string[] = [];

  for (const def of PAYROLL_PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { code: def.code },
      update: { name: def.name, groupId: group.id },
      create: { code: def.code, name: def.name, groupId: group.id },
    });

    permissionIds.push(permission.id);
    console.log(`Permissão OK: ${def.code}`);
  }

  const adminRoles = await prisma.role.findMany({
    where: { code: 'ADMIN' },
    select: { id: true },
  });

  let grants = 0;

  for (const role of adminRoles) {
    for (const permissionId of permissionIds) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });

      grants += 1;
    }
  }

  console.log(
    `${adminRoles.length} perfil(is) Administrador — ${grants} vínculo(s) garantido(s).`,
  );
}

/** INSS/IRRF/FGTS 2026 — ver plano/pesquisa da sessão. */
async function ensureTaxTable(companyId: string, companyLabel: string) {
  const existing = await prisma.payrollTaxTable.findFirst({
    where: { companyId },
  });

  if (existing) {
    console.log(`${companyLabel}: já tem tabela fiscal cadastrada, pulando.`);
    return;
  }

  await prisma.payrollTaxTable.create({
    data: {
      companyId,
      validFrom: new Date('2026-01-01T00:00:00Z'),
      fgtsPercentage: 8,
      dependentDeductionValue: 189.59,
      irrfReliefThreshold: 5000,
      irrfReliefPhaseOutEnd: 7350,
      irrfReliefBase: 978.62,
      irrfReliefFactor: 0.133145,
      brackets: {
        create: [
          // INSS
          { taxType: 'INSS', order: 1, minBase: 0, maxBase: 1621.0, rate: 7.5, deduction: 0 },
          { taxType: 'INSS', order: 2, minBase: 1621.01, maxBase: 2902.84, rate: 9, deduction: 24.32 },
          { taxType: 'INSS', order: 3, minBase: 2902.85, maxBase: 4354.27, rate: 12, deduction: 111.4 },
          { taxType: 'INSS', order: 4, minBase: 4354.28, maxBase: 8475.55, rate: 14, deduction: 198.49 },
          // IRRF
          { taxType: 'IRRF', order: 1, minBase: 0, maxBase: 2428.8, rate: 0, deduction: 0 },
          { taxType: 'IRRF', order: 2, minBase: 2428.81, maxBase: 2826.65, rate: 7.5, deduction: 182.16 },
          { taxType: 'IRRF', order: 3, minBase: 2826.66, maxBase: 3751.05, rate: 15, deduction: 394.16 },
          { taxType: 'IRRF', order: 4, minBase: 3751.06, maxBase: 4664.68, rate: 22.5, deduction: 675.49 },
          { taxType: 'IRRF', order: 5, minBase: 4664.69, maxBase: null, rate: 27.5, deduction: 908.73 },
        ],
      },
    },
  });

  console.log(`${companyLabel}: tabela fiscal 2026 cadastrada.`);
}

async function main() {
  await ensurePermissions();

  // Só nas empresas raiz (rootCompanyId nulo) — parâmetro fiscal é
  // por grupo econômico, não por filial.
  const rootCompanies = await prisma.company.findMany({
    where: { rootCompanyId: null },
    select: { id: true, tradeName: true, legalName: true },
  });

  for (const company of rootCompanies) {
    await ensureTaxTable(company.id, company.tradeName ?? company.legalName);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
