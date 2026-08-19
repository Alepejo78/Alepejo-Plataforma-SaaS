import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Backfill do catálogo comercial (Fase 1 do plano de licenciamento) —
 * cria os 3 planos fechados + o plano Customizado. Sem preço: o valor
 * é preenchido depois na tela de administração
 * (`/erp/licenciamento/planos`), não aqui — evita chumbar preço
 * errado no código.
 *
 * O plano ENTERPRISE (seed.ts) continua existindo separado, só pra uso
 * interno/demo — não é um dos planos comerciais.
 */
const PLANS: {
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  highlighted: boolean;
  moduleCodes: string[];
}[] = [
  {
    code: 'ESSENCIAL',
    name: 'Essencial',
    description:
      'Cadastros, produtos, estoque, vendas e financeiro — o básico pra rodar um comércio.',
    sortOrder: 1,
    highlighted: false,
    moduleCodes: ['BPS', 'PRODUCTS', 'INVENTORY', 'SALES', 'FINANCE'],
  },
  {
    code: 'PROFISSIONAL',
    name: 'Profissional',
    description: 'Essencial + Compras e Recursos Humanos.',
    sortOrder: 2,
    highlighted: true,
    moduleCodes: [
      'BPS',
      'PRODUCTS',
      'INVENTORY',
      'SALES',
      'FINANCE',
      'PURCHASE',
      'HR',
    ],
  },
  {
    code: 'COMPLETO',
    name: 'Completo',
    description: 'Profissional + Produção e Ponto/Folha de Pagamento.',
    sortOrder: 3,
    highlighted: false,
    moduleCodes: [
      'BPS',
      'PRODUCTS',
      'INVENTORY',
      'SALES',
      'FINANCE',
      'PURCHASE',
      'HR',
      'PRODUCTION',
      'LABOR',
    ],
  },
  {
    // Sem planModules de propósito: o acesso vem inteiramente dos
    // CompanyModule que o cliente escolheu no montador
    // (`/planos` → "Customizado", ou "Contratar módulos" em
    // Licenciamento) — ver CompanyOnboardingService.signup() e
    // BillingService.subscribe() (preço somado dos módulos, não do
    // Plan, pra esse code específico).
    code: 'CUSTOM',
    name: 'Plano Customizado',
    description: 'Monte o plano escolhendo só os módulos que sua empresa precisa.',
    sortOrder: 99,
    highlighted: false,
    moduleCodes: [],
  },
];

async function main() {
  for (const def of PLANS) {
    const plan = await prisma.plan.upsert({
      where: { code: def.code },
      update: {
        name: def.name,
        description: def.description,
        sortOrder: def.sortOrder,
        highlighted: def.highlighted,
        active: true,
      },
      create: {
        code: def.code,
        name: def.name,
        description: def.description,
        sortOrder: def.sortOrder,
        highlighted: def.highlighted,
        active: true,
      },
    });

    for (const moduleCode of def.moduleCodes) {
      const mod = await prisma.module.findUnique({
        where: { code: moduleCode },
      });

      if (!mod) {
        console.warn(`  ! Módulo ${moduleCode} não encontrado — pulando.`);
        continue;
      }

      await prisma.planModule.upsert({
        where: { planId_moduleId: { planId: plan.id, moduleId: mod.id } },
        update: { included: true },
        create: { planId: plan.id, moduleId: mod.id, included: true },
      });
    }

    console.log(`Plano OK: ${def.code} (${def.moduleCodes.length} módulo(s))`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
