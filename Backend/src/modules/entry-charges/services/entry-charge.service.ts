import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  EntryChargeStatus,
  FinancialEntry,
  FinancialEntryStatus,
  FinancialEntryType,
  PaymentMethod,
  SurchargeType,
} from '@prisma/client';

import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { mapAsaasPaymentStatus } from '../../../core/utils/asaas-status.util';
import { buildPixBRCode } from '../../../core/utils/pix-brcode.util';

import {
  AsaasCredentials,
  AsaasService,
} from '../../billing/services/asaas.service';
import {
  EmailAttachment,
  EmailNotificationsService,
} from '../../notifications/services/email-notifications.service';
import { WhatsappNotificationsService } from '../../notifications/services/whatsapp-notifications.service';
import { PaymentMethodSettingsRepository } from '../../payment-method-settings/repositories/payment-method-settings.repository';
import { FinancialEntriesService } from '../../financial-entries/services/financial-entries.service';

export type EntryWithPartner = FinancialEntry & {
  partner: {
    id: string;
    legalName: string;
    tradeName: string | null;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    document: string;
    asaasCustomerId: string | null;
  } | null;
};

interface Instructions {
  subject: string;
  emailHtml: string;
  whatsappText: string;
  attachments?: EmailAttachment[];
}

function money(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  BOLETO: 'Boleto',
  TRANSFERENCIA: 'Transferência',
  DEPOSITO: 'Depósito',
  DEBITO: 'Cartão de débito',
  CREDITO: 'Cartão de crédito',
  CHEQUE: 'Cheque',
  DESCONTO_NF: 'Desconto em nota fiscal',
  OUTRO: 'Outro',
};

function dateLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/** BOLETO/PIX/CREDITO/DEBITO → billingType real do Asaas. Demais → null (não gera cobrança lá). */
function asaasBillingTypeFor(method: PaymentMethod | null): string | null {
  switch (method) {
    case 'BOLETO':
      return 'BOLETO';
    case 'PIX':
      return 'PIX';
    case 'CREDITO':
      return 'CREDIT_CARD';
    case 'DEBITO':
      return 'UNDEFINED';
    default:
      return null;
  }
}

/**
 * `billingType`(s) válido(s) pra forma de pagamento atual — usado pra
 * detectar quando o título foi editado (ex.: era PIX, virou boleto)
 * DEPOIS de já ter gerado uma cobrança: a cobrança antiga fica presa
 * na forma de pagamento com que foi criada, e sem essa checagem o
 * PIX (ou boleto, etc.) antigo continuaria sendo reenviado pra sempre.
 * `null` = forma de pagamento sem cobrança gerenciada (dinheiro,
 * cheque, desconto em NF, outro, ou nenhuma).
 */
function expectedBillingTypesFor(
  method: PaymentMethod | null,
): string[] | null {
  switch (method) {
    case PaymentMethod.BOLETO:
      return ['BOLETO'];
    case PaymentMethod.PIX:
      return ['PIX', 'PIX_MANUAL'];
    case PaymentMethod.CREDITO:
    case PaymentMethod.DEBITO:
      return ['CREDIT_CARD', 'UNDEFINED'];
    case PaymentMethod.TRANSFERENCIA:
    case PaymentMethod.DEPOSITO:
      return ['BANK_TRANSFER'];
    default:
      return null;
  }
}

function applySurcharge(
  base: number,
  type: SurchargeType | null,
  value: number,
): number {
  if (!type || !value) {
    return base;
  }

  const withSurcharge =
    type === 'PERCENT' ? base * (1 + value / 100) : base + value;

  return Math.round(withSurcharge * 100) / 100;
}

@Injectable()
export class EntryChargeService {
  private readonly logger = new Logger(EntryChargeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasService,
    private readonly paymentMethodSettingsRepository: PaymentMethodSettingsRepository,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly whatsappNotifications: WhatsappNotificationsService,
    @Inject(forwardRef(() => FinancialEntriesService))
    private readonly financialEntriesService: FinancialEntriesService,
  ) {}

  /**
   * Gera (se ainda não existir) e manda a cobrança/instrução de
   * pagamento do título — chamado na criação do título e pelo botão
   * "Reenviar cobrança". Best-effort: nunca lança, só loga.
   */
  async notify(entry: EntryWithPartner): Promise<void> {
    try {
      if (
        entry.type !== FinancialEntryType.RECEIVABLE ||
        entry.status === FinancialEntryStatus.PAID ||
        entry.status === FinancialEntryStatus.CANCELLED ||
        !entry.partner
      ) {
        return;
      }

      if (!entry.partner.email && !entry.partner.mobile) {
        return;
      }

      const charge = await this.ensureCharge(entry);

      if (!charge) {
        return;
      }

      const instructions = await this.buildInstructions(entry, charge);

      if (!instructions) {
        return;
      }

      if (entry.partner.email) {
        void this.emailNotifications.send(
          entry.companyId,
          entry.partner.email,
          instructions.subject,
          instructions.emailHtml,
          instructions.attachments,
        );
      }

      if (entry.partner.mobile) {
        void this.whatsappNotifications.send(
          entry.companyId,
          entry.partner.mobile,
          instructions.whatsappText,
        );
      }

      await this.prisma.entryCharge.update({
        where: { id: charge.id },
        data: { lastSentAt: new Date() },
      });
    } catch (err) {
      this.logger.warn(
        `Falha ao gerar/enviar cobrança do título ${entry.id}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  /**
   * Garante que existe uma `EntryCharge` pro título — cria na
   * primeira vez (gerando no Asaas quando aplicável); nas próximas
   * chamadas só devolve a existente, sem duplicar cobrança no gateway.
   */
  private async ensureCharge(entry: EntryWithPartner) {
    const existing = await this.prisma.entryCharge.findUnique({
      where: { financialEntryId: entry.id },
    });

    if (existing) {
      const expectedBillingTypes = expectedBillingTypesFor(
        entry.paymentMethod,
      );

      if (
        expectedBillingTypes &&
        expectedBillingTypes.includes(existing.billingType)
      ) {
        return existing;
      }

      // Forma de pagamento foi trocada depois de já ter gerado essa
      // cobrança (ex.: era PIX, virou boleto) — descarta a antiga (só
      // localmente; não cancela nada já criado no Asaas) e gera de
      // novo, compatível com a forma de pagamento atual.
      await this.prisma.entryCharge.delete({ where: { id: existing.id } });

      if (!expectedBillingTypes) {
        return null;
      }
    }

    const settings =
      await this.paymentMethodSettingsRepository.getOrCreate(
        entry.companyId,
      );

    const [surchargeType, surchargeValue] = this.surchargeFor(
      entry.paymentMethod,
      settings,
    );

    if (surchargeType === undefined) {
      // Forma de pagamento sem cobrança gerenciada (dinheiro, cheque,
      // desconto em NF, outro) — comportamento de hoje, sem mudança.
      return null;
    }

    const amountCharged = applySurcharge(
      Number(entry.amount),
      surchargeType,
      surchargeValue,
    );

    if (
      entry.paymentMethod === PaymentMethod.TRANSFERENCIA ||
      entry.paymentMethod === PaymentMethod.DEPOSITO
    ) {
      return this.prisma.entryCharge.create({
        data: {
          financialEntryId: entry.id,
          billingType: 'BANK_TRANSFER',
          status: EntryChargeStatus.PENDING,
          amountCharged,
        },
      });
    }

    const billingType = asaasBillingTypeFor(entry.paymentMethod);
    const credentials =
      await this.paymentMethodSettingsRepository.getDecryptedAsaasCredentials(
        entry.companyId,
      );

    if (billingType && credentials && entry.partner!.email) {
      return this.createAsaasCharge(
        entry,
        billingType,
        amountCharged,
        credentials,
      );
    }

    if (entry.paymentMethod === PaymentMethod.PIX) {
      const staticPixCharge = await this.createStaticPixChargeIfEnabled(
        entry,
        amountCharged,
        settings,
      );

      if (staticPixCharge) {
        return staticPixCharge;
      }
    }

    // Sem gateway configurado (ou sem e-mail pro cliente virar cliente
    // no Asaas) e sem chave PIX própria — fica só informativo, sem
    // link real.
    return this.prisma.entryCharge.create({
      data: {
        financialEntryId: entry.id,
        billingType: billingType ?? 'UNDEFINED',
        status: EntryChargeStatus.PENDING,
        amountCharged,
      },
    });
  }

  /**
   * Chave PIX própria da empresa, sem gateway — gera o BR Code (padrão
   * Bacen) e o QR Code na hora, localmente. Sem baixa automática (não
   * tem webhook aqui): fica pendente até a empresa confirmar o
   * recebimento na mão, igual transferência/depósito.
   */
  private async createStaticPixChargeIfEnabled(
    entry: EntryWithPartner,
    amountCharged: number,
    settings: {
      pixKeyEnabled: boolean;
      pixKey: string | null;
      pixKeyOwnerName: string | null;
      pixKeyCity: string | null;
    },
  ) {
    if (
      !settings.pixKeyEnabled ||
      !settings.pixKey ||
      !settings.pixKeyOwnerName ||
      !settings.pixKeyCity
    ) {
      return null;
    }

    const txid = entry.id.replace(/[^A-Za-z0-9]/g, '').slice(0, 25);

    const pixPayload = buildPixBRCode({
      key: settings.pixKey,
      merchantName: settings.pixKeyOwnerName,
      merchantCity: settings.pixKeyCity,
      amount: amountCharged,
      txid,
    });

    const pixQrCodeImage = await QRCode.toBuffer(pixPayload)
      .then((buffer) => buffer.toString('base64'))
      .catch((err: unknown) => {
        this.logger.warn(
          `Falha ao gerar QR Code do PIX do título ${entry.id}: ${
            err instanceof Error ? err.message : err
          }`,
        );

        return undefined;
      });

    return this.prisma.entryCharge.create({
      data: {
        financialEntryId: entry.id,
        billingType: 'PIX_MANUAL',
        status: EntryChargeStatus.PENDING,
        amountCharged,
        pixPayload,
        pixQrCodeImage,
        publicToken: crypto.randomBytes(24).toString('hex'),
      },
    });
  }

  private surchargeFor(
    method: PaymentMethod | null,
    settings: {
      boletoSurchargeType: SurchargeType | null;
      boletoSurchargeValue: unknown;
      transferSurchargeType: SurchargeType | null;
      transferSurchargeValue: unknown;
      pixSurchargeType: SurchargeType | null;
      pixSurchargeValue: unknown;
      cardSurchargeType: SurchargeType | null;
      cardSurchargeValue: unknown;
    },
  ): [SurchargeType | null | undefined, number] {
    switch (method) {
      case PaymentMethod.BOLETO:
        return [
          settings.boletoSurchargeType,
          Number(settings.boletoSurchargeValue),
        ];
      case PaymentMethod.TRANSFERENCIA:
      case PaymentMethod.DEPOSITO:
        return [
          settings.transferSurchargeType,
          Number(settings.transferSurchargeValue),
        ];
      case PaymentMethod.PIX:
        return [
          settings.pixSurchargeType,
          Number(settings.pixSurchargeValue),
        ];
      case PaymentMethod.CREDITO:
      case PaymentMethod.DEBITO:
        return [
          settings.cardSurchargeType,
          Number(settings.cardSurchargeValue),
        ];
      default:
        return [undefined, 0];
    }
  }

  private async createAsaasCharge(
    entry: EntryWithPartner,
    billingType: string,
    amountCharged: number,
    credentials: AsaasCredentials,
  ) {
    const partner = entry.partner!;

    let asaasCustomerId = partner.asaasCustomerId;

    if (!asaasCustomerId) {
      const existingCustomer =
        await this.asaas.findCustomerByExternalReference(
          partner.id,
          credentials,
        );

      asaasCustomerId =
        existingCustomer?.id ??
        (
          await this.asaas.createCustomer(
            {
              externalReference: partner.id,
              name: partner.tradeName || partner.legalName,
              email: partner.email!,
              cpfCnpj: partner.document,
              phone: partner.mobile || partner.phone || undefined,
            },
            credentials,
          )
        ).id;

      await this.prisma.businessPartner.update({
        where: { id: partner.id },
        data: { asaasCustomerId },
      });
    }

    const payment = await this.asaas.createPayment(
      {
        customer: asaasCustomerId,
        billingType,
        value: amountCharged,
        dueDate: entry.dueDate.toISOString().slice(0, 10),
        description: entry.documentNumber
          ? `Título ${entry.documentNumber}`
          : `Título ${entry.id}`,
        externalReference: entry.id,
      },
      credentials,
    );

    let pixPayload: string | undefined;
    let pixQrCodeImage: string | undefined;

    if (billingType === 'PIX') {
      const qrCode = await this.asaas.getPixQrCode(payment.id, credentials);

      pixPayload = qrCode?.payload;
      pixQrCodeImage = qrCode?.encodedImage;
    }

    return this.prisma.entryCharge.create({
      data: {
        financialEntryId: entry.id,
        asaasPaymentId: payment.id,
        billingType,
        status: mapAsaasPaymentStatus(payment.status) as EntryChargeStatus,
        amountCharged,
        invoiceUrl: payment.invoiceUrl,
        bankSlipUrl: payment.bankSlipUrl,
        pixPayload,
        pixQrCodeImage,
      },
    });
  }

  private async buildInstructions(
    entry: EntryWithPartner,
    charge: {
      id: string;
      billingType: string;
      amountCharged: unknown;
      invoiceUrl: string | null;
      bankSlipUrl: string | null;
      pixPayload: string | null;
      pixQrCodeImage: string | null;
      publicToken: string | null;
    },
    /** false quando quem chama já mandou seu próprio texto de abertura (ex.: lembrete de vencimento) — evita repetir saudação/valor/vencimento. */
    includeIntro = true,
  ): Promise<Instructions | null> {
    const company = await this.prisma.company.findUnique({
      where: { id: entry.companyId },
    });

    const companyName = company?.tradeName || company?.legalName || '';
    const partnerName =
      entry.partner!.tradeName || entry.partner!.legalName;
    const amount = money(Number(charge.amountCharged));
    const due = dateLabel(entry.dueDate);

    const intro = includeIntro
      ? `Olá, ${partnerName}! Segue o pagamento do seu título com ${companyName} — ${amount}, vencimento ${due}. `
      : '';
    const introHtml = intro ? `<p>${intro}</p>` : '';

    if (charge.billingType === 'BANK_TRANSFER') {
      const settings =
        await this.paymentMethodSettingsRepository.getOrCreate(
          entry.companyId,
        );

      const bankAccount = settings.defaultBankAccountId
        ? await this.prisma.bankAccount.findUnique({
            where: { id: settings.defaultBankAccountId },
          })
        : null;

      if (!bankAccount) {
        return null;
      }

      const lines = [
        `Banco: ${bankAccount.bankName}`,
        bankAccount.agency && `Agência: ${bankAccount.agency}`,
        bankAccount.accountNumber &&
          `Conta: ${bankAccount.accountNumber}`,
        bankAccount.accountType &&
          `Tipo: ${bankAccount.accountType === 'CORRENTE' ? 'Conta corrente' : 'Poupança'}`,
      ].filter(Boolean);

      return {
        subject: `Dados para transferência — ${companyName}`,
        emailHtml: `${introHtml}<p>${lines.join('<br>')}</p>`,
        whatsappText: `${intro}\n${lines.join('\n')}`,
      };
    }

    if (charge.billingType === 'BOLETO' && charge.bankSlipUrl) {
      const text = `${intro} Seu boleto está disponível: ${charge.bankSlipUrl}`;

      return {
        subject: `Boleto disponível — ${companyName}`,
        emailHtml: `${introHtml}<p>Seu boleto está disponível: <a href="${charge.bankSlipUrl}">${charge.bankSlipUrl}</a></p>`,
        whatsappText: text,
      };
    }

    if (charge.billingType === 'PIX_MANUAL' && charge.publicToken) {
      const frontendUrl =
        process.env.FRONTEND_URL ?? 'http://localhost:3000';
      const paymentLink = `${frontendUrl}/pagamento-pix?id=${charge.id}&token=${charge.publicToken}`;

      const attachments: EmailAttachment[] | undefined = charge.pixQrCodeImage
        ? [
            {
              filename: 'pix-qrcode.png',
              content: Buffer.from(charge.pixQrCodeImage, 'base64'),
              contentType: 'image/png',
            },
          ]
        : undefined;

      return {
        subject: `Pague com PIX — ${companyName}`,
        emailHtml: `${introHtml}<p>Pague com PIX: <a href="${paymentLink}">${paymentLink}</a></p><p>A página mostra a chave, o QR Code e um botão pra copiar.</p>`,
        whatsappText: `${intro} Pague com PIX — acesse o link pra ver a chave e o QR Code:\n${paymentLink}`,
        attachments,
      };
    }

    if (charge.billingType === 'PIX' && charge.pixPayload) {
      const attachments: EmailAttachment[] | undefined = charge.pixQrCodeImage
        ? [
            {
              filename: 'pix-qrcode.png',
              content: Buffer.from(charge.pixQrCodeImage, 'base64'),
              contentType: 'image/png',
            },
          ]
        : undefined;

      return {
        subject: `Pague com PIX — ${companyName}`,
        emailHtml: `${introHtml}<p>Pague com PIX — copia e cola:</p><p style="word-break:break-all">${charge.pixPayload}</p>${attachments ? '<p>O QR code está anexado.</p>' : ''}`,
        whatsappText: `${intro} Pague com PIX (copia e cola):\n${charge.pixPayload}`,
        attachments,
      };
    }

    if (
      (charge.billingType === 'CREDIT_CARD' ||
        charge.billingType === 'UNDEFINED') &&
      charge.invoiceUrl
    ) {
      const settings =
        await this.paymentMethodSettingsRepository.getOrCreate(
          entry.companyId,
        );

      const text = `${intro} Pague com cartão em até ${settings.cardMaxInstallments}x: ${charge.invoiceUrl}`;

      return {
        subject: `Link de pagamento — ${companyName}`,
        emailHtml: `${introHtml}<p>Pague com cartão em até ${settings.cardMaxInstallments}x: <a href="${charge.invoiceUrl}">${charge.invoiceUrl}</a></p>`,
        whatsappText: text,
      };
    }

    // Método gerenciável mas sem gateway/chave configurado ainda — só
    // lembra o título e a forma de pagamento escolhida, sem link real.
    const methodLabel = entry.paymentMethod
      ? PAYMENT_METHOD_LABELS[entry.paymentMethod]
      : null;
    const methodLine = methodLabel
      ? `Forma de pagamento: ${methodLabel}.`
      : '';

    return {
      subject: `Título a pagar — ${companyName}`,
      emailHtml: `${introHtml}${methodLine ? `<p>${methodLine}</p>` : ''}`,
      whatsappText: [intro, methodLine].filter(Boolean).join('\n'),
    };
  }

  /**
   * Pro lembrete de vencimento (`ScheduledNotificationsService`)
   * anexar o meio de pagamento na mesma mensagem — garante a
   * cobrança (gera na primeira vez, senão reaproveita) e devolve só
   * o trecho de instrução, sem mandar nada aqui (quem chama decide
   * quando enviar, junto com o texto do lembrete).
   */
  async getInstructionsFragment(
    entry: EntryWithPartner,
  ): Promise<{ html: string; text: string; attachments?: EmailAttachment[] } | null> {
    try {
      if (
        entry.type !== FinancialEntryType.RECEIVABLE ||
        !entry.partner
      ) {
        return null;
      }

      const charge = await this.ensureCharge(entry);

      if (!charge) {
        return null;
      }

      const instructions = await this.buildInstructions(
        entry,
        charge,
        false,
      );

      if (!instructions) {
        return null;
      }

      await this.prisma.entryCharge.update({
        where: { id: charge.id },
        data: { lastSentAt: new Date() },
      });

      return {
        html: instructions.emailHtml,
        text: instructions.whatsappText,
        attachments: instructions.attachments,
      };
    } catch (err) {
      this.logger.warn(
        `Falha ao montar instrução de pagamento do título ${entry.id}: ${
          err instanceof Error ? err.message : err
        }`,
      );

      return null;
    }
  }

  /** Botão "Reenviar cobrança" — reaproveita a cobrança já gerada, nunca cria outra no Asaas. */
  async resend(companyId: string, entryId: string): Promise<void> {
    const entry = await this.prisma.financialEntry.findFirst({
      where: { id: entryId, companyId },
      include: { partner: true },
    });

    if (!entry) {
      return;
    }

    await this.notify(entry as EntryWithPartner);
  }

  /**
   * Página pública de pagamento (chave PIX própria, sem gateway) — o
   * link mandado por e-mail/WhatsApp aponta pra cá. Só existe pra
   * cobranças `PIX_MANUAL`; as outras formas (boleto/PIX/cartão via
   * Asaas) já têm página própria hospedada pelo gateway.
   */
  async getPublicInfo(id: string, token: string) {
    const charge = await this.prisma.entryCharge.findUnique({
      where: { id },
      include: { financialEntry: { include: { partner: true } } },
    });

    if (
      !charge ||
      charge.billingType !== 'PIX_MANUAL' ||
      !charge.publicToken ||
      charge.publicToken !== token
    ) {
      throw new NotFoundException('Link inválido.');
    }

    const entry = charge.financialEntry;

    const [company, settings] = await Promise.all([
      this.prisma.company.findUnique({
        where: { id: entry.companyId },
        select: { tradeName: true, legalName: true, logo: true, brandingLogoLightEnabled: true },
      }),
      this.paymentMethodSettingsRepository.getOrCreate(entry.companyId),
    ]);

    return {
      companyName: company?.tradeName || company?.legalName || '',
      companyLogo: company?.brandingLogoLightEnabled ? company.logo : null,
      partnerName: entry.partner
        ? entry.partner.tradeName || entry.partner.legalName
        : '',
      amount: Number(charge.amountCharged),
      dueDate: entry.dueDate,
      status: entry.status,
      pixKey: settings.pixKey,
      pixKeyType: settings.pixKeyType,
      pixPayload: charge.pixPayload,
      pixQrCodeImage: charge.pixQrCodeImage,
    };
  }

  /**
   * Webhook do Asaas — uma URL/token por empresa (ver
   * PaymentMethodSettingsController). Idempotente por evento; sempre
   * reconsulta o pagamento na API antes de agir.
   */
  async handleWebhook(
    companyId: string,
    payload: { id?: string; event: string; payment?: { id: string } },
  ): Promise<{ duplicated?: boolean; ignored?: boolean; processed?: boolean }> {
    const eventKey = payload.id ?? `${payload.payment?.id}:${payload.event}`;

    const already = await this.prisma.entryChargeWebhookEvent.findUnique({
      where: { asaasEventId: eventKey },
    });

    if (already) {
      return { duplicated: true };
    }

    await this.prisma.entryChargeWebhookEvent.create({
      data: {
        asaasEventId: eventKey,
        event: payload.event,
        payload: payload as object,
      },
    });

    if (!payload.payment?.id) {
      return { ignored: true };
    }

    const credentials =
      await this.paymentMethodSettingsRepository.getDecryptedAsaasCredentials(
        companyId,
      );

    if (!credentials) {
      return { ignored: true };
    }

    const payment = await this.asaas.getPayment(
      payload.payment.id,
      credentials,
    );

    const charge = await this.prisma.entryCharge.findUnique({
      where: { asaasPaymentId: payment.id },
      include: { financialEntry: true },
    });

    if (!charge) {
      this.logger.warn(
        `Webhook ${payload.event} pra pagamento ${payment.id} sem EntryCharge correspondente (empresa ${companyId}).`,
      );

      return { ignored: true };
    }

    const status = mapAsaasPaymentStatus(payment.status) as EntryChargeStatus;

    await this.prisma.entryCharge.update({
      where: { id: charge.id },
      data: { status },
    });

    const entry = charge.financialEntry;

    if (
      status === EntryChargeStatus.CONFIRMED &&
      entry.status === FinancialEntryStatus.OPEN
    ) {
      await this.prisma.financialEntry.update({
        where: { id: entry.id },
        data: { status: FinancialEntryStatus.AWAITING_CONFIRMATION },
      });
    } else if (
      status === EntryChargeStatus.RECEIVED &&
      entry.status !== FinancialEntryStatus.PAID
    ) {
      const settings =
        await this.paymentMethodSettingsRepository.getOrCreate(companyId);

      await this.financialEntriesService.settle(
        companyId,
        entry.id,
        {
          paymentDate: (payment.paymentDate ?? new Date().toISOString()).slice(
            0,
            10,
          ),
          paymentMethod: entry.paymentMethod ?? PaymentMethod.OUTRO,
          paidAmount: payment.value,
          bankAccountId: settings.defaultBankAccountId ?? undefined,
        },
        'sistema (webhook Asaas)',
      );
    }

    return { processed: true };
  }
}
