import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BillingChargeStatus,
  Prisma,
  type BillingCharge,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { AsaasService } from './asaas.service';
import type { BillingTypeValue } from '../dto/subscribe.dto';
import type { CreateCheckoutDto } from '../dto/create-checkout.dto';
import { CUSTOM_PLAN_CODE } from '../../identity/license/constants/custom-plan.constants';

/** Tolerância após o vencimento antes de bloquear — decisão do usuário. */
const GRACE_DAYS = 7;

/** Empresa dona da plataforma — é ela o "fornecedor" da mensalidade. */
const PLATFORM_COMPANY_CODE = 'ALEPEJO';

/** Prazo de validade de uma compra sem cadastro concluído. */
const CHECKOUT_EXPIRES_DAYS = 7;

export type MonthStatus = 'PAGO' | 'A_PAGAR' | 'VENCIDO' | 'VAZIO';

export interface MonthCell {
  month: number;
  value: number;
  status: MonthStatus;
}

export interface CustomerReportRow {
  companyId: string;
  legalName: string;
  tradeName: string | null;
  email: string | null;
  phone: string | null;
  document: string;
  planCode: string | null;
  planName: string | null;
  billingCycle: 'MONTHLY' | 'YEARLY' | null;
  modules: string[];
  months: MonthCell[];
  total: number;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function chargeStatusToMonthStatus(
  charge: BillingCharge,
  today: Date,
): MonthStatus {
  if (charge.status === 'RECEIVED' || charge.status === 'CONFIRMED') {
    return 'PAGO';
  }

  return charge.dueDate < today ? 'VENCIDO' : 'A_PAGAR';
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Asaas manda vários nomes de status — mapeia pro nosso enum fechado. */
function mapChargeStatus(asaasStatus: string): BillingChargeStatus {
  switch (asaasStatus) {
    case 'RECEIVED':
    case 'RECEIVED_IN_CASH':
      return 'RECEIVED';
    case 'CONFIRMED':
      return 'CONFIRMED';
    case 'OVERDUE':
      return 'OVERDUE';
    case 'REFUNDED':
    case 'REFUND_REQUESTED':
      return 'REFUNDED';
    case 'PENDING':
      return 'PENDING';
    default:
      return 'CANCELLED';
  }
}

/**
 * Orquestra a contratação (empresa em TRIAL/PAST_DUE vira cliente
 * pagante no Asaas) e o webhook (Asaas avisando que uma cobrança
 * mudou de status). O `LicenseService.isSubscriptionBlocked()` é quem
 * decide o bloqueio de verdade — este serviço só mantém `CompanyPlan`
 * atualizado com o estado real da assinatura.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService,
  ) {}

  /**
   * Plano Customizado não tem monthlyPrice/yearlyPrice próprio (varia
   * por empresa) — o valor é só a soma do preço de cada módulo
   * escolhido, no ciclo escolhido. Sem taxa-piso: zero módulo é zero
   * reais (decisão do usuário, 26-08-2026 — antes um mínimo de 5
   * módulos vinha sempre incluído, cobrando o preço do plano de
   * entrada mesmo sem nenhum módulo marcado).
   *
   * Recebe os ids dos módulos direto (em vez de buscar por empresa)
   * porque o mesmo cálculo serve pra dois momentos: empresa que já
   * existe (módulos vêm de `CompanyModule`) e compra feita antes do
   * cadastro (módulos vêm do montador de /planos, sem empresa nenhuma).
   */
  private async customPlanPriceFromModules(
    moduleIds: string[],
    billingCycle: 'MONTHLY' | 'YEARLY',
  ): Promise<number> {
    if (moduleIds.length === 0) {
      return 0;
    }

    const addOnModules = await this.prisma.module.findMany({
      where: {
        id: { in: moduleIds },
        active: true,
      },
    });

    return addOnModules.reduce((sum, mod) => {
      const price =
        billingCycle === 'YEARLY' ? mod.yearlyPrice : mod.monthlyPrice;

      return sum + Number(price ?? 0);
    }, 0);
  }

  /**
   * A mensalidade do ERP é uma despesa da empresa cliente, então cada
   * cobrança vira uma conta a pagar no Financeiro dela — some com o
   * "esqueci de lançar a mensalidade" e o fluxo de caixa fica certo.
   *
   * O fornecedor é a própria AlePejo: procura (ou cria) o parceiro com
   * o CNPJ da empresa da plataforma. `financial_entries` exige parceiro
   * OU colaborador por CHECK no banco, então esse cadastro não é
   * opcional.
   *
   * Idempotente pelo `billingChargeId` único: o webhook do Asaas chega
   * várias vezes pra mesma cobrança (criada, confirmada, recebida) e
   * não pode gerar título repetido.
   */
  private async syncFinancialEntry(
    companyId: string,
    charge: {
      id: string;
      value: Prisma.Decimal | number;
      dueDate: Date;
      status: BillingChargeStatus;
      paidAt: Date | null;
      type: string;
    },
    planName: string,
  ) {
    const pago =
      charge.status === 'RECEIVED' || charge.status === 'CONFIRMED';

    const existing = await this.prisma.financialEntry.findUnique({
      where: { billingChargeId: charge.id },
    });

    if (existing) {
      // Só acompanha a baixa: valor e vencimento de um título já
      // lançado são do cliente, não nossos pra reescrever.
      if (pago && existing.status !== 'PAID') {
        await this.prisma.financialEntry.update({
          where: { id: existing.id },
          data: {
            status: 'PAID',
            paidAmount: existing.amount,
            paymentDate: charge.paidAt ?? new Date(),
          },
        });
      }

      return;
    }

    const plataforma = await this.prisma.company.findFirst({
      where: { code: PLATFORM_COMPANY_CODE },
      select: { legalName: true, tradeName: true, document: true },
    });

    if (!plataforma) {
      this.logger.warn(
        `Sem empresa ${PLATFORM_COMPANY_CODE} no banco — cobrança ${charge.id} ficou sem conta a pagar.`,
      );

      return;
    }

    const partner =
      (await this.prisma.businessPartner.findFirst({
        where: { companyId, document: plataforma.document },
      })) ??
      (await this.prisma.businessPartner.create({
        data: {
          companyId,
          legalName: plataforma.legalName,
          tradeName: plataforma.tradeName ?? 'AlePejo ERP Cloud',
          document: plataforma.document,
          personType: 'COMPANY',
          roles: ['SUPPLIER'],
        },
      }));

    await this.prisma.financialEntry.create({
      data: {
        companyId,
        billingChargeId: charge.id,
        partnerId: partner.id,
        type: 'PAYABLE',
        status: pago ? 'PAID' : 'OPEN',
        issueDate: new Date(),
        dueDate: charge.dueDate,
        amount: charge.value,
        paidAmount: pago ? charge.value : 0,
        paymentDate: pago ? (charge.paidAt ?? new Date()) : null,
        observation:
          charge.type === 'SETUP_FEE'
            ? `Taxa de implantação — ${planName}`
            : `Assinatura ${planName} — AlePejo ERP Cloud`,
      },
    });
  }

  /** Mesmo cálculo acima, pros módulos que a empresa já tem habilitados. */
  private async customPlanPrice(
    companyId: string,
    billingCycle: 'MONTHLY' | 'YEARLY',
  ): Promise<number> {
    const companyModules = await this.prisma.companyModule.findMany({
      where: { companyId, enabled: true },
      select: { moduleId: true },
    });

    return this.customPlanPriceFromModules(
      companyModules.map((item) => item.moduleId),
      billingCycle,
    );
  }

  /**
   * Faturas da assinatura da empresa, pra tela de Cobranças.
   *
   * Antes de listar, reconsulta as cobranças da assinatura no Asaas e
   * grava o que faltar. É a rede de segurança pro webhook: se um aviso
   * se perder (fila pausada, token errado, servidor fora do ar), a
   * fatura aparece assim que o cliente abrir a tela, em vez de sumir.
   */
  async listCharges(companyId: string) {
    const companyPlan = await this.prisma.companyPlan.findUnique({
      where: { companyId },
      include: { plan: { select: { name: true } } },
    });

    if (!companyPlan) {
      return [];
    }

    if (companyPlan.asaasSubscriptionId) {
      try {
        const payments = await this.asaas.listSubscriptionPayments(
          companyPlan.asaasSubscriptionId,
        );

        for (const payment of payments) {
          const charge = await this.prisma.billingCharge.upsert({
            where: { asaasPaymentId: payment.id },
            update: {
              status: mapChargeStatus(payment.status),
              paidAt: payment.paymentDate
                ? new Date(payment.paymentDate)
                : null,
              invoiceUrl: payment.invoiceUrl,
              bankSlipUrl: payment.bankSlipUrl,
            },
            create: {
              companyPlanId: companyPlan.id,
              asaasPaymentId: payment.id,
              type: 'SUBSCRIPTION',
              billingType: payment.billingType,
              value: payment.value,
              dueDate: new Date(payment.dueDate),
              status: mapChargeStatus(payment.status),
              paidAt: payment.paymentDate
                ? new Date(payment.paymentDate)
                : null,
              invoiceUrl: payment.invoiceUrl,
              bankSlipUrl: payment.bankSlipUrl,
            },
          });

          void charge;
        }
      } catch (err) {
        // Asaas fora do ar não pode derrubar a tela — mostra o que já
        // está gravado e segue.
        this.logger.warn(
          `Não consegui sincronizar as cobranças com o Asaas: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    const charges = await this.prisma.billingCharge.findMany({
      where: { companyPlanId: companyPlan.id },
      orderBy: { dueDate: 'desc' },
    });

    // Garante o título em contas a pagar pra toda cobrança da lista,
    // não só pras que acabaram de chegar do Asaas: cobranças antigas
    // (de antes deste recurso) e a primeira, criada na contratação,
    // também precisam aparecer no Financeiro. `syncFinancialEntry` é
    // idempotente, então rodar sempre não duplica nada.
    for (const charge of charges) {
      await this.syncFinancialEntry(
        companyId,
        charge,
        companyPlan.plan.name,
      );
    }

    return charges;
  }

  /**
   * Troca o ciclo da assinatura (mensal ↔ anual). Não dá pra mudar o
   * ciclo de uma assinatura no Asaas: encerra a atual e cria outra.
   *
   * A diferença está em QUANDO a nova começa a cobrar, e ela vem das
   * regras decididas com o usuário:
   *
   * - **Mensal → anual**: cobra na hora. O cliente está trocando pra
   *   pagar adiantado com desconto, então segurar a cobrança pro mês
   *   que vem seria contra o próprio motivo da troca. O que ele já
   *   pagou do mês corrente continua valendo até vencer.
   *
   * - **Anual → mensal**: só na renovação. A primeira mensalidade vence
   *   no fim do período anual já pago, sem devolver nada e sem cobrar
   *   duas vezes. É por isso que a data de vencimento sai do
   *   `currentPeriodEnd` em vez de "amanhã".
   */
  async changeCycle(companyId: string, billingCycle: 'MONTHLY' | 'YEARLY') {
    const companyPlan = await this.prisma.companyPlan.findUnique({
      where: { companyId },
      include: { plan: true, company: true },
    });

    if (!companyPlan) {
      throw new NotFoundException(
        'Sua empresa ainda não tem um plano — fale com o suporte.',
      );
    }

    if (companyPlan.billingCycle === billingCycle) {
      throw new BadRequestException(
        billingCycle === 'YEARLY'
          ? 'Sua assinatura já é anual.'
          : 'Sua assinatura já é mensal.',
      );
    }

    if (!companyPlan.asaasCustomerId) {
      throw new BadRequestException(
        'Sua assinatura ainda não foi contratada — use o botão Contratar.',
      );
    }

    const price =
      companyPlan.plan.code === CUSTOM_PLAN_CODE
        ? await this.customPlanPrice(companyId, billingCycle)
        : billingCycle === 'YEARLY'
          ? companyPlan.plan.yearlyPrice
          : companyPlan.plan.monthlyPrice;

    if (!price) {
      throw new BadRequestException(
        billingCycle === 'YEARLY'
          ? 'Este plano ainda não tem preço anual definido — fale com o suporte.'
          : 'Este plano ainda não tem preço mensal definido — fale com o suporte.',
      );
    }

    const amanha = addDays(new Date(), 1);

    const proximoVencimento =
      billingCycle === 'MONTHLY' &&
      companyPlan.currentPeriodEnd &&
      companyPlan.currentPeriodEnd > amanha
        ? companyPlan.currentPeriodEnd
        : amanha;

    // Herda a forma de pagamento da última cobrança; sem histórico,
    // UNDEFINED deixa o cliente escolher na própria fatura.
    const ultima = await this.prisma.billingCharge.findFirst({
      where: { companyPlanId: companyPlan.id },
      orderBy: { createdAt: 'desc' },
      select: { billingType: true },
    });

    const billingType = (ultima?.billingType ??
      'UNDEFINED') as BillingTypeValue;

    if (companyPlan.asaasSubscriptionId) {
      try {
        await this.asaas.deleteSubscription(companyPlan.asaasSubscriptionId);
      } catch (err) {
        // Assinatura já removida no Asaas não pode travar a troca — o
        // que importa daqui pra frente é a nova.
        this.logger.warn(
          `Não consegui encerrar a assinatura ${companyPlan.asaasSubscriptionId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    const subscription = await this.asaas.createSubscription({
      customer: companyPlan.asaasCustomerId,
      billingType,
      value: Number(price),
      nextDueDate: formatDate(proximoVencimento),
      cycle: billingCycle,
      externalReference: companyPlan.id,
      description: `Assinatura ${companyPlan.plan.name} (${
        billingCycle === 'YEARLY' ? 'anual' : 'mensal'
      })`,
    });

    await this.prisma.companyPlan.update({
      where: { id: companyPlan.id },
      data: {
        billingCycle,
        asaasSubscriptionId: subscription.id,
      },
    });

    const payments = await this.asaas.listSubscriptionPayments(
      subscription.id,
    );

    const primeira =
      payments.find((p) => p.status === 'PENDING') ?? payments[0];

    if (primeira) {
      const charge = await this.prisma.billingCharge.upsert({
        where: { asaasPaymentId: primeira.id },
        update: {
          invoiceUrl: primeira.invoiceUrl,
          bankSlipUrl: primeira.bankSlipUrl,
        },
        create: {
          companyPlanId: companyPlan.id,
          asaasPaymentId: primeira.id,
          type: 'SUBSCRIPTION',
          billingType,
          value: primeira.value,
          dueDate: new Date(primeira.dueDate),
          status: mapChargeStatus(primeira.status),
          invoiceUrl: primeira.invoiceUrl,
          bankSlipUrl: primeira.bankSlipUrl,
        },
      });

      await this.syncFinancialEntry(
        companyId,
        charge,
        companyPlan.plan.name,
      );
    }

    return {
      billingCycle,
      value: Number(price),
      dueDate: formatDate(proximoVencimento),
      invoiceUrl: primeira?.invoiceUrl ?? null,
      /** Anual → mensal não gera cobrança pra agora: a primeira vence no fim do período pago. */
      cobrancaImediata: billingCycle === 'YEARLY',
    };
  }

  /**
   * "Comprar agora" de /planos: cobra ANTES da empresa existir. Cria o
   * cliente + assinatura no Asaas e guarda um `PendingCheckout` com o
   * plano e os dados do comprador — a empresa só nasce depois, no
   * cadastro (ver CompanyOnboardingService.signup, campo checkoutId).
   * Assim quem desiste no pagamento não deixa cadastro à toa.
   */
  async createCheckout(dto: CreateCheckoutDto) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan || !plan.active) {
      throw new NotFoundException('Plano não encontrado.');
    }

    const document = dto.document.replace(/\D/g, '');

    // Recusa ANTES de gerar qualquer cobrança — não faz sentido cobrar
    // alguém por uma conta que o cadastro depois vai rejeitar (mesma
    // checagem do CompanyOnboardingService.signup).
    const existingCompany = await this.prisma.company.findFirst({
      where: { document, deletedAt: null },
    });

    if (existingCompany) {
      throw new ConflictException(
        'Já existe uma empresa cadastrada com este documento. Faça login em vez de comprar de novo.',
      );
    }

    const moduleIds = dto.moduleIds ?? [];

    const price =
      plan.code === CUSTOM_PLAN_CODE
        ? await this.customPlanPriceFromModules(moduleIds, dto.billingCycle)
        : Number(
            (dto.billingCycle === 'YEARLY'
              ? plan.yearlyPrice
              : plan.monthlyPrice) ?? 0,
          );

    if (!price) {
      throw new BadRequestException(
        'O plano escolhido ainda não tem preço definido — fale com o suporte.',
      );
    }

    const customer = await this.asaas.createCustomer({
      externalReference: `checkout:${document}`,
      name: dto.name,
      email: dto.email,
      cpfCnpj: document,
      phone: dto.phone,
    });

    const nextDueDate = formatDate(addDays(new Date(), 1));

    const subscription = await this.asaas.createSubscription({
      customer: customer.id,
      billingType: dto.billingType,
      value: price,
      nextDueDate,
      cycle: dto.billingCycle,
      externalReference: `checkout:${document}`,
      description: `Assinatura ${plan.name} (${
        dto.billingCycle === 'YEARLY' ? 'anual' : 'mensal'
      })`,
    });

    const payments = await this.asaas.listSubscriptionPayments(
      subscription.id,
    );

    const firstPayment =
      payments.find((p) => p.status === 'PENDING') ?? payments[0];

    const checkout = await this.prisma.pendingCheckout.create({
      data: {
        planId: plan.id,
        billingCycle: dto.billingCycle,
        moduleIds,
        document,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        asaasCustomerId: customer.id,
        asaasSubscriptionId: subscription.id,
        asaasPaymentId: firstPayment?.id,
        billingType: dto.billingType,
        value: price,
        expiresAt: addDays(new Date(), CHECKOUT_EXPIRES_DAYS),
      },
    });

    const pix =
      dto.billingType === 'PIX' && firstPayment
        ? await this.asaas.getPixQrCode(firstPayment.id)
        : null;

    return {
      checkoutId: checkout.id,
      billingType: dto.billingType,
      value: firstPayment?.value ?? price,
      dueDate: firstPayment?.dueDate ?? nextDueDate,
      invoiceUrl: firstPayment?.invoiceUrl,
      bankSlipUrl: firstPayment?.bankSlipUrl,
      pixPayload: pix?.payload,
      pixQrCodeImage: pix?.encodedImage,
    };
  }

  /**
   * Dados do checkout pra tela de cadastro preencher e travar o plano.
   * Público (não existe sessão ainda) — o id é um cuid não adivinhável
   * e só devolve o que o próprio comprador acabou de digitar.
   */
  async getCheckout(id: string) {
    const checkout = await this.prisma.pendingCheckout.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!checkout) {
      throw new NotFoundException('Compra não encontrada.');
    }

    if (checkout.companyId) {
      throw new ConflictException(
        'Esta compra já foi usada para cadastrar uma empresa.',
      );
    }

    return {
      id: checkout.id,
      planId: checkout.planId,
      planName: checkout.plan.name,
      planCode: checkout.plan.code,
      billingCycle: checkout.billingCycle,
      value: Number(checkout.value),
      document: checkout.document,
      name: checkout.name,
      email: checkout.email,
      phone: checkout.phone,
      paid: checkout.paid,
    };
  }

  async subscribe(companyId: string, billingType: BillingTypeValue) {
    const companyPlan = await this.prisma.companyPlan.findUnique({
      where: { companyId },
      include: { plan: true, company: true },
    });

    if (!companyPlan) {
      throw new NotFoundException(
        'Sua empresa ainda não tem um plano — fale com o suporte.',
      );
    }

    if (companyPlan.status === 'ACTIVE') {
      throw new BadRequestException('Sua assinatura já está ativa.');
    }

    const price =
      companyPlan.plan.code === 'CUSTOM'
        ? await this.customPlanPrice(companyId, companyPlan.billingCycle)
        : companyPlan.billingCycle === 'YEARLY'
          ? companyPlan.plan.yearlyPrice
          : companyPlan.plan.monthlyPrice;

    if (!price) {
      throw new BadRequestException(
        'O plano contratado ainda não tem preço definido — fale com o suporte.',
      );
    }

    const company = companyPlan.company;

    let customerId = companyPlan.asaasCustomerId;

    if (!customerId) {
      const existing = await this.asaas.findCustomerByExternalReference(
        company.id,
      );

      const customer =
        existing ??
        (await this.asaas.createCustomer({
          externalReference: company.id,
          name: company.legalName,
          email: company.email ?? '',
          cpfCnpj: company.document,
          phone: company.phone ?? undefined,
        }));

      customerId = customer.id;
    }

    const nextDueDate = formatDate(addDays(new Date(), 1));

    // Taxa de implantação: cobrança avulsa, só na primeira contratação.
    if (companyPlan.plan.setupFee && Number(companyPlan.plan.setupFee) > 0) {
      const alreadyCharged = await this.prisma.billingCharge.findFirst({
        where: { companyPlanId: companyPlan.id, type: 'SETUP_FEE' },
      });

      if (!alreadyCharged) {
        const setupPayment = await this.asaas.createPayment({
          customer: customerId,
          billingType,
          value: Number(companyPlan.plan.setupFee),
          dueDate: nextDueDate,
          description: `Taxa de implantação — ${companyPlan.plan.name}`,
          externalReference: companyPlan.id,
        });

        await this.prisma.billingCharge.create({
          data: {
            companyPlanId: companyPlan.id,
            asaasPaymentId: setupPayment.id,
            type: 'SETUP_FEE',
            billingType,
            value: companyPlan.plan.setupFee,
            dueDate: new Date(setupPayment.dueDate),
            status: mapChargeStatus(setupPayment.status),
            invoiceUrl: setupPayment.invoiceUrl,
            bankSlipUrl: setupPayment.bankSlipUrl,
          },
        });
      }
    }

    let subscriptionId = companyPlan.asaasSubscriptionId;

    if (!subscriptionId) {
      const subscription = await this.asaas.createSubscription({
        customer: customerId,
        billingType,
        value: Number(price),
        nextDueDate,
        cycle: companyPlan.billingCycle,
        externalReference: companyPlan.id,
        description: `Assinatura ${companyPlan.plan.name} (${companyPlan.billingCycle === 'YEARLY' ? 'anual' : 'mensal'})`,
      });

      subscriptionId = subscription.id;
    }

    await this.prisma.companyPlan.update({
      where: { id: companyPlan.id },
      data: {
        asaasCustomerId: customerId,
        asaasSubscriptionId: subscriptionId,
      },
    });

    const payments = await this.asaas.listSubscriptionPayments(
      subscriptionId,
    );

    const firstPayment =
      payments.find((p) => p.status === 'PENDING') ?? payments[0];

    if (!firstPayment) {
      return { billingType, value: Number(price), dueDate: nextDueDate };
    }

    await this.prisma.billingCharge.upsert({
      where: { asaasPaymentId: firstPayment.id },
      update: {},
      create: {
        companyPlanId: companyPlan.id,
        asaasPaymentId: firstPayment.id,
        type: 'SUBSCRIPTION',
        billingType,
        value: firstPayment.value,
        dueDate: new Date(firstPayment.dueDate),
        status: mapChargeStatus(firstPayment.status),
        invoiceUrl: firstPayment.invoiceUrl,
        bankSlipUrl: firstPayment.bankSlipUrl,
      },
    });

    const pix =
      billingType === 'PIX'
        ? await this.asaas.getPixQrCode(firstPayment.id)
        : null;

    return {
      billingType,
      value: firstPayment.value,
      dueDate: firstPayment.dueDate,
      invoiceUrl: firstPayment.invoiceUrl,
      bankSlipUrl: firstPayment.bankSlipUrl,
      pixPayload: pix?.payload,
      pixQrCodeImage: pix?.encodedImage,
    };
  }

  /**
   * Idempotente (dedupe por `asaasEventId`) e não confia no corpo do
   * webhook: reconsulta a cobrança direto na API do Asaas antes de
   * ativar qualquer coisa — o payload recebido pode ter sido forjado
   * se o header de autenticação vazasse, então só serve pra saber
   * QUAL cobrança olhar, nunca pro valor/status em si.
   */
  async handleWebhook(payload: {
    id?: string;
    event: string;
    payment?: { id: string };
  }) {
    const eventKey = payload.id ?? `${payload.payment?.id}:${payload.event}`;

    const already = await this.prisma.billingWebhookEvent.findUnique({
      where: { asaasEventId: eventKey },
    });

    if (already) {
      return { duplicated: true };
    }

    await this.prisma.billingWebhookEvent.create({
      data: {
        asaasEventId: eventKey,
        event: payload.event,
        payload: payload as object,
      },
    });

    if (!payload.payment?.id) {
      return { ignored: true };
    }

    const payment = await this.asaas.getPayment(payload.payment.id);

    const companyPlan = await this.prisma.companyPlan.findFirst({
      where: {
        OR: [
          { asaasSubscriptionId: payment.subscription },
          { asaasCustomerId: payment.customer },
        ],
      },
    });

    if (!companyPlan) {
      // Pode ser uma compra feita antes do cadastro ("Comprar agora"):
      // aí ainda não existe CompanyPlan, só o PendingCheckout. Marca
      // como pago pra que o cadastro seguinte já nasça ATIVO. Quando a
      // empresa existir, o CompanyPlan carrega os mesmos ids do Asaas e
      // casa antes daqui.
      const pending = await this.prisma.pendingCheckout.findFirst({
        where: {
          companyId: null,
          OR: [
            { asaasSubscriptionId: payment.subscription },
            { asaasCustomerId: payment.customer },
          ],
        },
      });

      if (pending) {
        const isPaid =
          payload.event === 'PAYMENT_CONFIRMED' ||
          payload.event === 'PAYMENT_RECEIVED';

        if (isPaid) {
          await this.prisma.pendingCheckout.update({
            where: { id: pending.id },
            data: { paid: true, paidAt: new Date() },
          });
        }

        return { processed: true, pendingCheckout: true };
      }

      this.logger.warn(
        `Webhook ${payload.event} pra pagamento ${payment.id} sem CompanyPlan correspondente.`,
      );

      return { ignored: true };
    }

    const chargeType =
      (
        await this.prisma.billingCharge.findUnique({
          where: { asaasPaymentId: payment.id },
        })
      )?.type ?? 'SUBSCRIPTION';

    // Os links entram também no update: as cobranças dos meses
    // seguintes nascem no Asaas (a assinatura gera sozinha) e chegam
    // aqui só pelo webhook — sem guardar o link, a tela de Cobranças
    // teria a fatura listada mas sem como pagar.
    const charge = await this.prisma.billingCharge.upsert({
      where: { asaasPaymentId: payment.id },
      update: {
        status: mapChargeStatus(payment.status),
        paidAt: payment.paymentDate ? new Date(payment.paymentDate) : null,
        invoiceUrl: payment.invoiceUrl,
        bankSlipUrl: payment.bankSlipUrl,
      },
      create: {
        companyPlanId: companyPlan.id,
        asaasPaymentId: payment.id,
        type: chargeType,
        billingType: payment.billingType,
        value: payment.value,
        dueDate: new Date(payment.dueDate),
        status: mapChargeStatus(payment.status),
        paidAt: payment.paymentDate ? new Date(payment.paymentDate) : null,
        invoiceUrl: payment.invoiceUrl,
        bankSlipUrl: payment.bankSlipUrl,
      },
    });

    const plan = await this.prisma.plan.findUnique({
      where: { id: companyPlan.planId },
      select: { name: true },
    });

    await this.syncFinancialEntry(
      companyPlan.companyId,
      charge,
      plan?.name ?? 'AlePejo ERP Cloud',
    );

    // A taxa de implantação é cobrança avulsa — não representa o
    // ciclo da assinatura, então não deve mexer no status/prazo dela.
    if (chargeType === 'SETUP_FEE') {
      return { processed: true };
    }

    if (
      payload.event === 'PAYMENT_CONFIRMED' ||
      payload.event === 'PAYMENT_RECEIVED'
    ) {
      const periodDays = companyPlan.billingCycle === 'YEARLY' ? 365 : 30;

      await this.prisma.companyPlan.update({
        where: { id: companyPlan.id },
        data: {
          status: 'ACTIVE',
          currentPeriodEnd: addDays(new Date(), periodDays),
          graceUntil: null,
        },
      });

      // O que estava marcado como "a contratar" passa a ser contratado
      // de fato — é este pagamento que cobre os módulos escolhidos.
      await this.prisma.companyModule.updateMany({
        where: { companyId: companyPlan.companyId, enabled: true },
        data: { licensed: true },
      });
    } else if (payload.event === 'PAYMENT_OVERDUE') {
      await this.prisma.companyPlan.update({
        where: { id: companyPlan.id },
        data: {
          status: 'PAST_DUE',
          graceUntil: addDays(new Date(), GRACE_DAYS),
        },
      });
    }

    return { processed: true };
  }

  /**
   * Relatório de clientes e faturamento — só o dono da plataforma vê
   * (`platform.license.manage`). Uma linha por empresa RAIZ (empresas
   * do grupo herdam a licença da raiz e não são cobradas à parte,
   * então não entram aqui) que não seja a própria ALEPEJO.
   *
   * Mensal: cada mês mapeia numa cobrança real (`BillingCharge`) se
   * existir; sem cobrança, projeta o preço atual pros meses atuais/
   * futuros (ainda não gerados pelo Asaas) e deixa vazio o que é
   * anterior ao início do plano.
   *
   * Anual: existe só UMA cobrança por ano — se caiu no ano pedido, os
   * 12 meses recebem o mesmo status dela, com o valor já dividido por
   * 12 (o "desconto anual" mostrado mês a mês).
   */
  async customerReport(year: number): Promise<CustomerReportRow[]> {
    const today = new Date();

    const companies = await this.prisma.company.findMany({
      where: {
        rootCompanyId: null,
        code: { not: 'ALEPEJO' },
        deletedAt: null,
      },
      include: {
        companyPlan: {
          include: {
            plan: {
              include: {
                planModules: { include: { module: true } },
              },
            },
            charges: { where: { type: 'SUBSCRIPTION' } },
          },
        },
        companyModules: {
          where: { enabled: true },
          include: { module: true },
        },
      },
      orderBy: { legalName: 'asc' },
    });

    const rows: CustomerReportRow[] = [];

    for (const company of companies) {
      const companyPlan = company.companyPlan;

      if (!companyPlan) {
        rows.push({
          companyId: company.id,
          legalName: company.legalName,
          tradeName: company.tradeName,
          email: company.email,
          phone: company.phone,
          document: company.document,
          planCode: null,
          planName: null,
          billingCycle: null,
          modules: company.companyModules.map((cm) => cm.module.name),
          months: Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            value: 0,
            status: 'VAZIO' as const,
          })),
          total: 0,
        });

        continue;
      }

      const { plan, charges, billingCycle, startDate } = companyPlan;

      const [monthly, yearly] =
        plan.code === 'CUSTOM'
          ? await Promise.all([
              this.customPlanPrice(company.id, 'MONTHLY'),
              this.customPlanPrice(company.id, 'YEARLY'),
            ])
          : [Number(plan.monthlyPrice ?? 0), Number(plan.yearlyPrice ?? 0)];

      const months = this.buildMonthsGrid({
        year,
        billingCycle,
        monthly,
        yearly,
        charges,
        planStartDate: startDate,
        today,
      });

      rows.push({
        companyId: company.id,
        legalName: company.legalName,
        tradeName: company.tradeName,
        email: company.email,
        phone: company.phone,
        document: company.document,
        planCode: plan.code,
        planName: plan.name,
        billingCycle,
        // Plano fixo: módulos vêm do próprio plano (PlanModule) — não
        // existe CompanyModule pra cada um. Customizado: não tem
        // PlanModule nenhum, o acesso inteiro é via CompanyModule.
        modules:
          plan.code === 'CUSTOM'
            ? company.companyModules.map((cm) => cm.module.name)
            : plan.planModules
                .filter((pm) => pm.included)
                .map((pm) => pm.module.name),
        months,
        total: months.reduce((sum, m) => sum + m.value, 0),
      });
    }

    return rows;
  }

  private buildMonthsGrid(params: {
    year: number;
    billingCycle: 'MONTHLY' | 'YEARLY';
    monthly: number;
    yearly: number;
    charges: BillingCharge[];
    planStartDate: Date;
    today: Date;
  }): MonthCell[] {
    const { year, billingCycle, monthly, yearly, charges, planStartDate, today } =
      params;

    const planStartMonth = startOfMonth(planStartDate);

    if (billingCycle === 'YEARLY') {
      const yearCharge = charges.find(
        (c) => c.dueDate.getFullYear() === year,
      );

      let value = yearly / 12;
      let status: MonthStatus = 'VAZIO';

      if (yearCharge) {
        value = Number(yearCharge.value) / 12;
        status = chargeStatusToMonthStatus(yearCharge, today);
      } else if (planStartDate.getFullYear() <= year) {
        // Sem cobrança gerada ainda pra esse ano — projeta como "a pagar".
        status = 'A_PAGAR';
      }

      return Array.from({ length: 12 }, (_, i) => {
        const monthDate = new Date(year, i, 1);
        const withinPlan = monthDate >= planStartMonth;

        return {
          month: i + 1,
          value: withinPlan && status !== 'VAZIO' ? value : 0,
          status: withinPlan ? status : 'VAZIO',
        };
      });
    }

    // MONTHLY
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const monthDate = new Date(year, i, 1);

      const charge = charges.find(
        (c) =>
          c.dueDate.getFullYear() === year &&
          c.dueDate.getMonth() + 1 === month,
      );

      if (charge) {
        return {
          month,
          value: Number(charge.value),
          status: chargeStatusToMonthStatus(charge, today),
        };
      }

      if (monthDate < planStartMonth) {
        return { month, value: 0, status: 'VAZIO' as const };
      }

      const isCurrentOrFuture =
        year > today.getFullYear() ||
        (year === today.getFullYear() && month >= today.getMonth() + 1);

      if (isCurrentOrFuture) {
        return { month, value: monthly, status: 'A_PAGAR' as const };
      }

      return { month, value: 0, status: 'VAZIO' as const };
    });
  }
}
