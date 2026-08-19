import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Preços reais do catálogo (planos e módulos avulsos) — pesquisa de
 * mercado + 20% de desconto anual, aplicados originalmente só no
 * banco local (nunca ficaram num script permanente, por isso sumiam
 * toda vez que o banco era resetado/reseedado, ex.: produção nova).
 * Idempotente — roda de novo sem problema.
 */
const PLAN_PRICES: Record<
  string,
  { monthlyPrice: number; yearlyPrice: number; setupFee?: number }
> = {
  ESSENCIAL: { monthlyPrice: 119.9, yearlyPrice: 1151.04 },
  PROFISSIONAL: { monthlyPrice: 179.8, yearlyPrice: 1726.08 },
  COMPLETO: {
    monthlyPrice: 339.5,
    yearlyPrice: 3259.2,
    setupFee: 3259.2,
  },
};

const MODULE_PRICES: Record<
  string,
  { monthlyPrice: number; yearlyPrice: number }
> = {
  FINANCE: { monthlyPrice: 59.9, yearlyPrice: 575.04 },
  BRANDING: { monthlyPrice: 39.9, yearlyPrice: 383.04 },
  LABOR: { monthlyPrice: 69.9, yearlyPrice: 671.04 },
  HR: { monthlyPrice: 59.9, yearlyPrice: 575.04 },
  PRODUCTION: { monthlyPrice: 49.9, yearlyPrice: 479.04 },
};

async function main() {
  for (const [code, prices] of Object.entries(PLAN_PRICES)) {
    const plan = await prisma.plan.findUnique({ where: { code } });

    if (!plan) {
      console.log(`Plano ${code} não encontrado, pulando.`);
      continue;
    }

    await prisma.plan.update({ where: { code }, data: prices });
    console.log(`Plano ${code} atualizado.`);
  }

  for (const [code, prices] of Object.entries(MODULE_PRICES)) {
    const mod = await prisma.module.findUnique({ where: { code } });

    if (!mod) {
      console.log(`Módulo ${code} não encontrado, pulando.`);
      continue;
    }

    await prisma.module.update({ where: { code }, data: prices });
    console.log(`Módulo ${code} atualizado.`);
  }

  console.log('Preços do catálogo aplicados.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
