import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Correção pontual (11-09-2026): empresa FAZAM CAR (slug `fazam-car`,
 * CNPJ 44.277.489/0001-19) teve o plano trocado pra Customizado com
 * Financeiro (e Estoque/Produtos, puxados por dependência) enquanto
 * já era assinante ATIVA — o autoatendimento salvou a escolha mas
 * deixou os módulos novos em "a contratar" (`licensed: false`) até o
 * próximo pagamento confirmar, travando o acesso por um mês inteiro.
 * Esse bug foi corrigido no código (`BillingService.
 * syncActiveCustomModulesPricing`, chamado agora por
 * `LicenseService.setCustomModules`), mas só vale pra troca de módulo
 * DAQUI PRA FRENTE — não conserta retroativamente quem já ficou preso
 * nesse estado. Rodar uma vez só, direto em produção.
 *
 * Faz o que o código corrigido já faria se rodasse de novo: libera
 * (`licensed: true`) todo módulo habilitado da empresa e atualiza o
 * valor da assinatura recorrente na Asaas pro total certo — sem
 * cobrança avulsa agora, só corrige o que vai ser cobrado dali pra
 * frente.
 */
const COMPANY_SLUG = 'fazam-car';

async function main() {
  const company = await prisma.company.findUnique({
    where: { slug: COMPANY_SLUG },
    select: { id: true, slug: true, document: true, legalName: true },
  });

  if (!company) {
    console.log(`Empresa "${COMPANY_SLUG}" não encontrada — nada feito.`);
    return;
  }

  console.log(
    `Empresa encontrada: ${company.legalName} (documento ${company.document}, id ${company.id}).`,
  );

  const companyPlan = await prisma.companyPlan.findUnique({
    where: { companyId: company.id },
    include: { plan: true },
  });

  if (!companyPlan) {
    console.log('Empresa sem CompanyPlan — nada feito.');
    return;
  }

  console.log(
    `Plano atual: ${companyPlan.plan.code} (${companyPlan.plan.name}), status ${companyPlan.status}, ciclo ${companyPlan.billingCycle}.`,
  );

  if (companyPlan.status !== 'ACTIVE' || companyPlan.plan.code !== 'CUSTOM') {
    console.log(
      'Não está em Plano Customizado ativo — condição inesperada, nada feito por segurança. Confira manualmente.',
    );
    return;
  }

  const enabledModules = await prisma.companyModule.findMany({
    where: { companyId: company.id, enabled: true },
    include: { module: true },
  });

  console.log(
    'Módulos habilitados antes da correção:',
    enabledModules.map((m) => `${m.module.code} (licensed=${m.licensed})`),
  );

  await prisma.companyModule.updateMany({
    where: { companyId: company.id, enabled: true },
    data: { licensed: true },
  });

  console.log('Módulos liberados (licensed: true).');

  const newTotal = enabledModules.reduce((sum, m) => {
    const price =
      companyPlan.billingCycle === 'YEARLY'
        ? m.module.yearlyPrice
        : m.module.monthlyPrice;

    return sum + Number(price ?? 0);
  }, 0);

  console.log(
    `Novo valor total do Plano Customizado (${companyPlan.billingCycle}): R$ ${newTotal.toFixed(2)}.`,
  );

  if (!companyPlan.asaasSubscriptionId) {
    console.log(
      'Empresa sem asaasSubscriptionId (sem assinatura recorrente na Asaas ainda) — nada a atualizar lá.',
    );
    return;
  }

  const apiKey = process.env.ASAAS_API_KEY;
  const apiUrl = process.env.ASAAS_API_URL || 'https://api-sandbox.asaas.com/v3';

  if (!apiKey) {
    console.log(
      'ASAAS_API_KEY não configurada neste ambiente — não deu pra atualizar o valor da assinatura na Asaas. Ajustar manualmente.',
    );
    return;
  }

  const response = await fetch(
    `${apiUrl}/subscriptions/${companyPlan.asaasSubscriptionId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        access_token: apiKey,
      },
      body: JSON.stringify({ value: newTotal }),
    },
  );

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    console.log(
      `Falha ao atualizar a assinatura ${companyPlan.asaasSubscriptionId} na Asaas (status ${response.status}):`,
      body,
    );
    return;
  }

  console.log(
    `Assinatura ${companyPlan.asaasSubscriptionId} atualizada na Asaas pra R$ ${newTotal.toFixed(2)}.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
