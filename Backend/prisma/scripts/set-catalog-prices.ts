import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Preços do catálogo de módulos avulsos do Plano Customizado
 * (10-09-2026) — ajustados e testados só no banco local durante o
 * desenvolvimento do montador de plano, nunca guardados num script
 * permanente (mesmo problema já visto antes: preço some a cada
 * reseed/produção nova). Roda uma vez só pra igualar produção ao que
 * já foi decidido localmente; daqui pra frente o admin edita preço
 * direto pela tela "Administrar Planos" tanto local quanto em
 * produção. Idempotente — roda de novo sem problema.
 *
 * OBS: não mexe em `Plan` (Essencial/Profissional/Enterprise/RH/
 * RH+Folha) de propósito — esses preços já são os certos em produção
 * e não têm relação com esta entrega.
 */
const MODULE_PRICES: Record<
  string,
  { monthlyPrice: number; yearlyPrice: number | null }
> = {
  PRODUCTS: { monthlyPrice: 0, yearlyPrice: null },
  INVENTORY: { monthlyPrice: 30, yearlyPrice: 325 },
  INVENTORY_COUNT: { monthlyPrice: 15, yearlyPrice: 165 },
  PURCHASE: { monthlyPrice: 12, yearlyPrice: 130 },
  SALES: { monthlyPrice: 12, yearlyPrice: 130 },
  FINANCE: { monthlyPrice: 45, yearlyPrice: 486 },
  BRANDING: { monthlyPrice: 5.9, yearlyPrice: 65 },
  HR: { monthlyPrice: 45, yearlyPrice: 486 },
  PRODUCTION: { monthlyPrice: 12, yearlyPrice: 130 },
  LABOR: { monthlyPrice: 55, yearlyPrice: 595 },
  WHATSAPP: { monthlyPrice: 0, yearlyPrice: null },
  EMAIL: { monthlyPrice: 0, yearlyPrice: null },
};

async function main() {
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
