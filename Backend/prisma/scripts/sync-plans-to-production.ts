import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * SÓ PARA RODAR NO RAILWAY CONSOLE (produção) — sincroniza os planos e
 * preços cadastrados no ambiente local (captura de 26-08-2026) com o
 * banco de produção. Local é a fonte da verdade: sobrescreve nome,
 * preço, descrição e módulos de todo plano cujo `code` já existir;
 * cria o que não existir.
 *
 * Nunca apaga um Plan — CompanyPlan.planId tem onDelete: Restrict, e
 * empresa cliente real pode estar amarrada nele; o Postgres bloquearia
 * a exclusão de qualquer forma. Um plano de produção com `code` que
 * não está nesta lista só é desativado (active=false), pra sumir da
 * página de preços sem quebrar nada de quem já está nele.
 */

interface PlanSeed {
  code: string;
  name: string;
  description: string | null;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  setupFee: number | null;
  maxUsers: number | null;
  sortOrder: number;
  highlighted: boolean;
  active: boolean;
  moduleCodes: string[];
}

const PLANS: PlanSeed[] = [
  {
    code: 'BÁSICO',
    name: 'Básico - Compras/Vendas',
    description: 'Cadastros, produtos, estoque, compra e venda.',
    monthlyPrice: 50.5,
    yearlyPrice: 515.1,
    setupFee: 0,
    maxUsers: null,
    sortOrder: 1,
    highlighted: false,
    active: true,
    moduleCodes: [
      'BPS',
      'PRODUCTS',
      'PURCHASE',
      'SALES',
      'INVENTORY',
      'PRODUCTION',
    ],
  },
  {
    code: 'FINANÇA',
    name: 'Essencial',
    description: 'Básico + Financeiro',
    monthlyPrice: 63.3,
    yearlyPrice: 646.68,
    setupFee: 0,
    maxUsers: null,
    sortOrder: 2,
    highlighted: false,
    active: true,
    moduleCodes: [
      'BPS',
      'PRODUCTS',
      'INVENTORY',
      'PURCHASE',
      'SALES',
      'FINANCE',
      'PRODUCTION',
      'BRANDING',
    ],
  },
  {
    code: 'RH',
    name: 'Recursos Humanos',
    description: 'Gestão para Recursos humanos',
    monthlyPrice: 33.9,
    yearlyPrice: 345.78,
    setupFee: 0,
    maxUsers: null,
    sortOrder: 3,
    highlighted: false,
    active: true,
    moduleCodes: ['HR', 'BRANDING'],
  },
  {
    code: 'RH_F',
    name: 'Recursos Humanos + Folha',
    description: 'Gestão completa RH + ponto + Folha',
    monthlyPrice: 55.9,
    yearlyPrice: 570.18,
    setupFee: 0,
    maxUsers: null,
    sortOrder: 4,
    highlighted: false,
    active: true,
    moduleCodes: ['HR', 'LABOR', 'BRANDING'],
  },
  {
    code: 'COMPLETO',
    name: 'Completo',
    description: 'Pacote com todos os modulos',
    monthlyPrice: 89.9,
    yearlyPrice: 920,
    setupFee: 0,
    maxUsers: null,
    sortOrder: 5,
    highlighted: true,
    active: true,
    moduleCodes: [
      'BPS',
      'PURCHASE',
      'BRANDING',
      'LABOR',
      'PRODUCTS',
      'SALES',
      'HR',
      'INVENTORY',
      'FINANCE',
      'PRODUCTION',
    ],
  },
  {
    code: 'CUSTOM',
    name: 'Plano Customizado',
    description:
      'Monte o plano escolhendo só os módulos que sua empresa precisa.',
    monthlyPrice: null,
    yearlyPrice: null,
    setupFee: null,
    maxUsers: null,
    sortOrder: 99,
    highlighted: false,
    active: true,
    moduleCodes: [],
  },
];

async function main() {
  const localCodes = PLANS.map((p) => p.code);

  for (const seed of PLANS) {
    console.log(`Plano ${seed.code}...`);

    const plan = await prisma.plan.upsert({
      where: { code: seed.code },
      create: {
        code: seed.code,
        name: seed.name,
        description: seed.description,
        monthlyPrice: seed.monthlyPrice,
        yearlyPrice: seed.yearlyPrice,
        setupFee: seed.setupFee,
        maxUsers: seed.maxUsers,
        sortOrder: seed.sortOrder,
        highlighted: seed.highlighted,
        active: seed.active,
      },
      update: {
        name: seed.name,
        description: seed.description,
        monthlyPrice: seed.monthlyPrice,
        yearlyPrice: seed.yearlyPrice,
        setupFee: seed.setupFee,
        maxUsers: seed.maxUsers,
        sortOrder: seed.sortOrder,
        highlighted: seed.highlighted,
        active: seed.active,
      },
    });

    const moduleIds: string[] = [];

    for (const moduleCode of seed.moduleCodes) {
      const mod = await prisma.module.findUnique({
        where: { code: moduleCode },
      });

      if (!mod) {
        throw new Error(
          `Módulo "${moduleCode}" (usado no plano ${seed.code}) não existe neste banco — confira antes de continuar.`,
        );
      }

      moduleIds.push(mod.id);
    }

    await prisma.planModule.deleteMany({
      where: { planId: plan.id, moduleId: { notIn: moduleIds } },
    });

    for (const moduleId of moduleIds) {
      await prisma.planModule.upsert({
        where: { planId_moduleId: { planId: plan.id, moduleId } },
        create: { planId: plan.id, moduleId, included: true },
        update: { included: true },
      });
    }

    console.log(`  ok — ${moduleIds.length} módulo(s).`);
  }

  console.log(
    '\nDesativando (sem apagar) planos de produção que não existem localmente...',
  );

  const deactivated = await prisma.plan.updateMany({
    where: { code: { notIn: localCodes }, active: true },
    data: { active: false },
  });

  console.log(`  ${deactivated.count} plano(s) desativado(s).`);

  console.log('\nPronto.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
