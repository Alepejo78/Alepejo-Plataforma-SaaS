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
  // "Completo" tirado do catálogo — decisão do usuário (09-09-2026),
  // ver o mesmo comentário em seed.ts.
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
  // Só CRIA — nunca faz update num plano que já existe (mesma regra
  // do seed.ts, ver comentário lá: preço/nome/ativo é dado de negócio
  // gerido em `/erp/licenciamento/planos`, não pode ser sobrescrito
  // rodando este script de novo).
  for (const def of PLANS) {
    const existing = await prisma.plan.findUnique({
      where: { code: def.code },
    });

    if (existing) {
      console.log(`Plano já existe, não mexi: ${def.code}`);
      continue;
    }

    const plan = await prisma.plan.create({
      data: {
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

      await prisma.planModule.create({
        data: { planId: plan.id, moduleId: mod.id, included: true },
      });
    }

    console.log(`Plano criado: ${def.code} (${def.moduleCodes.length} módulo(s))`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
