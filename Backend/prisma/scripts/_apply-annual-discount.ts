import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 20% de desconto no anual: 12 meses x 0,8.
function yearly(monthly: number): number {
  return Number((monthly * 12 * 0.8).toFixed(2));
}

async function main() {
  const plans = await prisma.plan.findMany({ where: { monthlyPrice: { not: null } } });
  for (const plan of plans) {
    const monthly = Number(plan.monthlyPrice);
    const updated = await prisma.plan.update({
      where: { id: plan.id },
      data: { yearlyPrice: yearly(monthly) },
    });
    console.log(`Plano ${plan.code}: R$ ${monthly}/mês -> R$ ${updated.yearlyPrice}/ano`);
  }

  const modules = await prisma.module.findMany({ where: { monthlyPrice: { not: null } } });
  for (const mod of modules) {
    const monthly = Number(mod.monthlyPrice);
    const updated = await prisma.module.update({
      where: { id: mod.id },
      data: { yearlyPrice: yearly(monthly) },
    });
    console.log(`Módulo ${mod.code}: R$ ${monthly}/mês -> R$ ${updated.yearlyPrice}/ano`);
  }
}
main().finally(() => prisma.$disconnect());
