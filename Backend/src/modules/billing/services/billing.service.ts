import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BillingChargeStatus, type BillingCharge } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { AsaasService } from './asaas.service';
import type { BillingTypeValue } from '../dto/subscribe.dto';
import type { CreateCheckoutDto } from '../dto/create-checkout.dto';
import {
  CUSTOM_PLAN_CODE,
  MINIMUM_CUSTOM_MODULE_CODES,
} from '../../identity/license/constants/custom-plan.constants';

/** Tolerância após o vencimento antes de bloquear — decisão do usuário. */
const GRACE_DAYS = 7;

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

/**
 * O Customizado já inclui os módulos mínimos, então parte do preço do
 * plano de entrada que traz exatamente esses módulos e soma só os
 * extras escolhidos. Assim o preço-base acompanha o que estiver
 * cadastrado em Administrar planos, em vez de ficar fixo no código.
 *
 * Em ordem de preferência: o Básico é o plano de entrada de hoje; o
 * Essencial fica de reserva pros catálogos que ainda não têm Básico
 * (era ele o plano de entrada antes). A mesma ordem está na tela de
 * planos — se as duas discordarem, o cliente vê um preço e é cobrado
 * outro.
 */
const CUSTOM_PLAN_BASE_CODES = ['BASICO', 'ESSENCIAL'];

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
   * por empresa) — o valor é o preço-base do Essencial (cobre os
   * mesmos módulos mínimos) + o preço de cada módulo extra escolhido,
   * no ciclo escolhido.
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
    const basePlans = await this.prisma.plan.findMany({
      where: { code: { in: CUSTOM_PLAN_BASE_CODES } },
    });

    const basePlan = CUSTOM_PLAN_BASE_CODES.map((code) =>
      basePlans.find((plan) => plan.code === code),
    ).find(Boolean);

    const base = basePlan
      ? Number(
          (billingCycle === 'YEARLY'
            ? basePlan.yearlyPrice
            : basePlan.monthlyPrice) ?? 0,
        )
      : 0;

    if (moduleIds.length === 0) {
      return base;
    }

    // Os mínimos já estão cobertos pelo preço-base — só os extras somam.
    const addOnModules = await this.prisma.module.findMany({
      where: {
        id: { in: moduleIds },
        active: true,
        code: { notIn: MINIMUM_CUSTOM_MODULE_CODES },
      },
    });

    const addOns = addOnModules.reduce((sum, mod) => {
      const price =
        billingCycle === 'YEARLY' ? mod.yearlyPrice : mod.monthlyPrice;

      return sum + Number(price ?? 0);
    }, 0);

    return base + addOns;
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

    await this.prisma.billingCharge.upsert({
      where: { asaasPaymentId: payment.id },
      update: {
        status: mapChargeStatus(payment.status),
        paidAt: payment.paymentDate ? new Date(payment.paymentDate) : null,
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
      },
    });

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
