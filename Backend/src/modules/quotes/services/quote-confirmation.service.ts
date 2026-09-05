import * as crypto from 'crypto';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import {
  NotificationType,
  Prisma,
  QuotePurpose,
  QuoteStatus,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  applyInstallmentInterest,
  buildAutoInstallments,
} from '../../../core/utils/installment.util';
import { findUsersWithPermission } from '../../../core/utils/permission-users.util';
import { EmailNotificationsService } from '../../notifications/services/email-notifications.service';
import { WhatsappNotificationsService } from '../../notifications/services/whatsapp-notifications.service';
import { InAppNotificationsService } from '../../in-app-notifications/services/in-app-notifications.service';
import { SalesSettingsService } from '../../sales-settings/services/sales-settings.service';

import { QuoteService } from './quote.service';
import { QuotePdfService } from './quote-pdf.service';

import { PublicApproveQuoteDto } from '../dto/public-approve-quote.dto';
import { PublicRequestRevisionDto } from '../dto/public-request-revision.dto';
import { PublicCancelQuoteDto } from '../dto/public-cancel-quote.dto';

/** Sem `validUntil` cadastrado no orçamento (raro), o link vale por esse tanto. */
const FALLBACK_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function quoteNumberOf(quote: { number: number }) {
  return `ORC-${String(quote.number).padStart(6, '0')}`;
}

/**
 * Aprovação digital do orçamento pelo cliente — mesmo mecanismo de
 * `VacationConfirmationService` (ver comentário lá): token público,
 * sem login, link por e-mail/WhatsApp. Aqui o cliente tem 3 opções em
 * vez de uma (Aprovar/Revisar/Cancelar), e a aprovação já escolhe a
 * forma de pagamento (à vista/a prazo + parcelas), com juros calculado
 * na hora conforme `SalesSettings`.
 */
@Injectable()
export class QuoteConfirmationService {
  private readonly logger = new Logger(QuoteConfirmationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly whatsappNotifications: WhatsappNotificationsService,
    private readonly notifications: InAppNotificationsService,
    private readonly salesSettings: SalesSettingsService,
    private readonly quoteService: QuoteService,
    private readonly quotePdf: QuotePdfService,
  ) {}

  /** Gera (ou renova) o link e manda por e-mail/WhatsApp ao cliente. */
  async sendConfirmation(companyId: string, id: string) {
    const quote = await this.quoteService.findOne(companyId, id);

    if (!this.quoteService.isApprovable(quote.status)) {
      throw new BadRequestException(
        'Somente orçamentos em rascunho ou com revisão solicitada podem ser enviados para o cliente aprovar.',
      );
    }

    const partner = quote.partner;

    if (!partner.email && !partner.mobile) {
      throw new BadRequestException(
        'Este cliente não tem e-mail nem celular cadastrado — não há como enviar o link de aprovação.',
      );
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    // `validUntil` é data pura (meia-noite UTC do dia escolhido) — o
    // link precisa valer o dia INTEIRO, então a expiração real é o
    // início do dia seguinte (senão já nasce expirado depois das 21h
    // no horário do Brasil, por causa do fuso).
    const expiresAt = quote.validUntil
      ? new Date(new Date(quote.validUntil).getTime() + 24 * 60 * 60 * 1000)
      : new Date(Date.now() + FALLBACK_TOKEN_TTL_MS);

    await this.prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: QuoteStatus.SENT,
        confirmationTokenHash: tokenHash,
        confirmationTokenExpiresAt: expiresAt,
        confirmationSentAt: new Date(),
        // Começa um ciclo de decisão novo — sem isso, um orçamento que
        // já teve revisão pedida uma vez travaria pra sempre a
        // aprovação do reenvio seguinte (ver `claimDecision`).
        customerApprovedAt: null,
        customerRevisionNote: null,
        customerRevisionAt: null,
        customerCancelledAt: null,
        customerCancelReason: null,
      },
    });

    return this.dispatch(companyId, quote, token);
  }

  private async dispatch(
    companyId: string,
    quote: Awaited<ReturnType<QuoteService['findOne']>>,
    token: string,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    const companyName =
      company?.tradeName || company?.legalName || '';
    const partner = quote.partner;
    const partnerName = partner.tradeName || partner.legalName;
    const quoteNumber = quoteNumberOf(quote);

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const link = `${frontendUrl}/confirmar-orcamento?id=${quote.id}&token=${token}`;

    const pdf = await this.quotePdf
      .generate(quote, company)
      .catch((err: unknown) => {
        this.logger.warn(
          `Falha ao gerar PDF do orçamento ${quoteNumber}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );

        return null;
      });

    const channels: string[] = [];

    if (partner.email) {
      const sent = await this.emailNotifications.send(
        companyId,
        partner.email,
        `Orçamento ${quoteNumber} pronto para sua aprovação — ${companyName}`,
        `<p>Olá, ${partnerName},</p>
<p>Nosso orçamento <strong>${quoteNumber}</strong> de <strong>${companyName}</strong> está pronto. Clique no botão abaixo para ver os detalhes e aprovar, pedir uma revisão ou cancelar:</p>
<p style="text-align: center; margin: 24px 0;">
  <a href="${link}" style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Ver orçamento</a>
</p>
<p style="font-size: 13px; color: #666;">Se o botão não funcionar, copie e cole este link no navegador:<br><a href="${link}">${link}</a></p>`,
        pdf
          ? [
              {
                filename: `${quoteNumber}.pdf`,
                content: pdf,
                contentType: 'application/pdf',
              },
            ]
          : undefined,
      );

      if (sent) {
        channels.push('email');
      }
    }

    if (partner.mobile) {
      const sent = await this.whatsappNotifications.send(
        companyId,
        partner.mobile,
        `Olá, ${partnerName}! Nosso orçamento ${quoteNumber} (${companyName}) está pronto pra você decidir. Confira aqui: ${link}`,
      );

      if (sent) {
        channels.push('whatsapp');
      }
    }

    return { sent: channels.length > 0, channels };
  }

  /**
   * O link continua válido depois de decidido (aprovado/revisão
   * pedida/cancelado) — só pra consulta, sem repetir a ação — porque
   * o cliente pode querer reabrir o mesmo e-mail/WhatsApp mais tarde
   * pra conferir o que decidiu. Por isso o hash nunca é apagado (ver
   * `claimDecision`). A data de expiração (`válido até`) só é
   * respeitada enquanto o orçamento ainda está pendente — depois de
   * decidido, ela deixa de fazer sentido pra bloquear a consulta.
   */
  private async validatePublicToken(
    id: string,
    token: string,
    opts?: { forConsultationOnly?: boolean },
  ) {
    const quote = await this.prisma.quote.findFirst({
      where: { id },
      include: {
        partner: true,
        items: { include: { product: true } },
      },
    });

    if (
      !quote ||
      !quote.confirmationTokenHash ||
      hashToken(token) !== quote.confirmationTokenHash
    ) {
      throw new BadRequestException(
        'Link de aprovação inválido ou expirado. Peça um novo link.',
      );
    }

    const alreadyDecided = !this.quoteService.isApprovable(quote.status);
    const expired =
      !quote.confirmationTokenExpiresAt ||
      quote.confirmationTokenExpiresAt < new Date();

    if (expired && !(opts?.forConsultationOnly && alreadyDecided)) {
      throw new BadRequestException(
        'Link de aprovação inválido ou expirado. Peça um novo link.',
      );
    }

    return quote;
  }

  /**
   * Trava a decisão de uma vez só: só grava se nenhum dos três
   * desfechos (aprovado/revisão/cancelado) já tiver sido registrado —
   * `updateMany` com essa condição só afeta a linha se ainda estiver
   * em aberto. Se o cliente clicar duas vezes rápido (ou a conexão
   * cair e ele tentar de novo), a segunda chamada não encontra mais a
   * linha em aberto — 0 linhas afetadas — e é rejeitada aqui, antes de
   * gerar um segundo Pedido/Ordem de Serviço pro mesmo orçamento. Não
   * mexe no token — ele continua servindo pra consulta depois.
   */
  private async claimDecision(
    quoteId: string,
    data: Prisma.QuoteUpdateManyMutationInput,
  ) {
    const claimed = await this.prisma.quote.updateMany({
      where: {
        id: quoteId,
        customerApprovedAt: null,
        customerRevisionAt: null,
        customerCancelledAt: null,
      },
      data,
    });

    if (claimed.count === 0) {
      throw new BadRequestException(
        'Este orçamento não está mais aguardando aprovação.',
      );
    }
  }

  /** Resumo pra tela pública (sem login). */
  async getPublicInfo(id: string, token: string) {
    const quote = await this.validatePublicToken(id, token, {
      forConsultationOnly: true,
    });

    const company = await this.prisma.company.findUnique({
      where: { id: quote.companyId },
      select: {
        tradeName: true,
        legalName: true,
        logo: true,
        brandingLogoLightEnabled: true,
      },
    });

    const settings = await this.salesSettings.getSettings(quote.companyId);

    return {
      quoteNumber: quoteNumberOf(quote),
      companyName: company?.tradeName || company?.legalName || '',
      companyLogo: company?.brandingLogoLightEnabled
        ? company.logo
        : null,
      partnerName: quote.partner.tradeName || quote.partner.legalName,
      validUntil: quote.validUntil,
      purpose: quote.purpose,
      serviceDescription: quote.serviceDescription,
      items: quote.items.map((item) => ({
        description: item.product?.description ?? item.productId,
        detail: item.description,
        itemKind: item.itemKind,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      netAmount: Number(quote.netAmount),
      status: quote.status,
      customerRevisionNote: quote.customerRevisionNote,
      customerCancelReason: quote.customerCancelReason,
      salesSettings: {
        maxInstallments: settings.maxInstallments,
        interestFreeInstallments: settings.interestFreeInstallments,
        interestRatePerInstallment: Number(
          settings.interestRatePerInstallment,
        ),
      },
    };
  }

  /** Best-effort: avisa todos com `quote.approve` por e-mail. */
  private async notifyResponsibles(
    companyId: string,
    quote: { number: number },
    subject: string,
    html: string,
  ) {
    const users = await findUsersWithPermission(
      this.prisma,
      companyId,
      'quote.approve',
    );

    for (const user of users) {
      void this.emailNotifications.send(companyId, user.email, subject, html);
    }
  }

  /**
   * Consumo público — cliente aprova, escolhendo forma de pagamento
   * (à vista/a prazo + parcelas) igual em orçamento de venda ou de
   * serviço. A diferença fica só no que acontece depois de aprovado:
   * venda já vira Pedido de Venda; serviço só autoriza (a Ordem de
   * Serviço herda esse mesmo prazo/parcelas quando for criada — ver
   * `QuoteService.performApproval` e `importFromQuote` no frontend),
   * sem gerar Pedido nenhum.
   */
  async approvePublic(id: string, token: string, dto: PublicApproveQuoteDto) {
    const quote = await this.validatePublicToken(id, token);

    if (!this.quoteService.isApprovable(quote.status)) {
      throw new BadRequestException(
        'Este orçamento não está mais aguardando aprovação.',
      );
    }

    const company = await this.prisma.company.findUnique({
      where: { id: quote.companyId },
      select: { rootCompanyId: true },
    });
    const rootCompanyId = company?.rootCompanyId ?? quote.companyId;

    const settings = await this.salesSettings.getSettings(quote.companyId);

    const installmentsCount =
      dto.paymentTiming === 'A_VISTA' ? 1 : (dto.installmentsCount ?? 0);

    if (dto.paymentTiming === 'A_PRAZO') {
      if (!installmentsCount || installmentsCount < 2) {
        throw new BadRequestException(
          'Informe a quantidade de parcelas.',
        );
      }

      if (installmentsCount > settings.maxInstallments) {
        throw new BadRequestException(
          `No máximo ${settings.maxInstallments} parcelas.`,
        );
      }
    }

    const interestAmount = applyInstallmentInterest(
      Number(quote.netAmount),
      installmentsCount,
      settings.interestFreeInstallments,
      Number(settings.interestRatePerInstallment),
    );

    const otherExpenses = Number(quote.otherExpenses) + interestAmount;
    const netAmount =
      Number(quote.totalAmount) -
      Number(quote.discountValue) +
      Number(quote.freightValue) +
      otherExpenses;

    // Parcelas planejadas no orçamento vêm do rascunho (normalmente
    // 1, o valor cheio) — a quantidade escolhida agora pelo cliente
    // pode ser outra, então recalcula do zero pra não ficar com o
    // número de parcelas dizendo uma coisa e as parcelas de verdade
    // outra.
    const plannedInstallments =
      installmentsCount > 1
        ? buildAutoInstallments(
            new Date(),
            quote.termDays ?? 0,
            installmentsCount,
            netAmount,
          ).map((row) => ({
            dueDate: row.dueDate.toISOString(),
            amount: row.amount,
          }))
        : null;

    await this.claimDecision(quote.id, {
      installmentsCount,
      otherExpenses,
      netAmount,
      installmentInterestAmount: interestAmount,
      plannedInstallments: plannedInstallments ?? Prisma.JsonNull,
      customerApprovedAt: new Date(),
    });

    const refreshed = await this.quoteService.findOne(
      quote.companyId,
      quote.id,
    );

    const approved = await this.quoteService.performApproval(
      quote.companyId,
      rootCompanyId,
      refreshed,
      quote.createdById ?? '',
    );

    if (quote.purpose === QuotePurpose.SERVICE) {
      void this.notifications.emit({
        rootCompanyId,
        type: NotificationType.QUOTE_SERVICE_APPROVED,
        dedupeKey: `quote-service-approved:${quote.id}`,
        title: 'Orçamento de serviço aprovado',
        message: `O cliente autorizou o serviço do orçamento ${quoteNumberOf(quote)} — aguardando gerar a Ordem de Serviço.`,
        permissionCode: 'service-order.create',
        linkUrl: '/erp/vendas/ordens-servico',
        documentRef: quoteNumberOf(quote),
      });
    } else {
      void this.notifications.emit({
        rootCompanyId,
        type: NotificationType.QUOTE_APPROVED_BY_CUSTOMER,
        dedupeKey: `quote-approved-customer:${quote.id}`,
        title: 'Orçamento aprovado pelo cliente',
        message: `O cliente aprovou o orçamento ${quoteNumberOf(quote)}.`,
        permissionCode: 'quote.approve',
        linkUrl: '/erp/vendas/orcamentos',
        documentRef: quoteNumberOf(quote),
      });
    }

    return { success: true, quote: approved };
  }

  /** Consumo público — cliente pede revisão, descrevendo o que falta ajustar. */
  async requestRevisionPublic(
    id: string,
    token: string,
    dto: PublicRequestRevisionDto,
  ) {
    const quote = await this.validatePublicToken(id, token);

    if (!this.quoteService.isApprovable(quote.status)) {
      throw new BadRequestException(
        'Este orçamento não está mais aguardando aprovação.',
      );
    }

    await this.claimDecision(quote.id, {
      status: QuoteStatus.REVISION_REQUESTED,
      customerRevisionNote: dto.message,
      customerRevisionAt: new Date(),
    });

    const quoteNumber = quoteNumberOf(quote);

    void this.notifications.emit({
      rootCompanyId: quote.companyId,
      type: NotificationType.QUOTE_REVISION_REQUESTED,
      dedupeKey: `quote-revision:${quote.id}:${Date.now()}`,
      title: 'Cliente pediu revisão do orçamento',
      message: `${quote.partner.tradeName || quote.partner.legalName} pediu revisão do orçamento ${quoteNumber}: "${dto.message}"`,
      permissionCode: 'quote.approve',
      linkUrl: '/erp/vendas/orcamentos',
      documentRef: quoteNumber,
    });

    void this.notifyResponsibles(
      quote.companyId,
      quote,
      `Cliente pediu revisão do orçamento ${quoteNumber}`,
      `<p>O cliente <strong>${quote.partner.tradeName || quote.partner.legalName}</strong> pediu revisão do orçamento <strong>${quoteNumber}</strong>:</p>
<blockquote style="margin: 16px 0; padding: 12px 16px; border-left: 3px solid #2563eb; background: #f5f7fb;">${dto.message}</blockquote>
<p>Ajuste o orçamento e envie o link de aprovação novamente pro cliente.</p>`,
    );

    return { success: true };
  }

  /** Consumo público — cliente cancela, informando o motivo. */
  async cancelPublic(id: string, token: string, dto: PublicCancelQuoteDto) {
    const quote = await this.validatePublicToken(id, token);

    if (!this.quoteService.isApprovable(quote.status)) {
      throw new BadRequestException(
        'Este orçamento não está mais aguardando aprovação.',
      );
    }

    await this.claimDecision(quote.id, {
      status: QuoteStatus.CANCELLED,
      customerCancelReason: dto.reason,
      customerCancelledAt: new Date(),
    });

    const quoteNumber = quoteNumberOf(quote);

    void this.notifications.emit({
      rootCompanyId: quote.companyId,
      type: NotificationType.QUOTE_CANCELLED_BY_CUSTOMER,
      dedupeKey: `quote-cancelled-customer:${quote.id}`,
      title: 'Cliente cancelou o orçamento',
      message: `${quote.partner.tradeName || quote.partner.legalName} cancelou o orçamento ${quoteNumber}: "${dto.reason}"`,
      permissionCode: 'quote.approve',
      linkUrl: '/erp/vendas/orcamentos',
      documentRef: quoteNumber,
    });

    void this.notifyResponsibles(
      quote.companyId,
      quote,
      `Cliente cancelou o orçamento ${quoteNumber}`,
      `<p>O cliente <strong>${quote.partner.tradeName || quote.partner.legalName}</strong> cancelou o orçamento <strong>${quoteNumber}</strong>:</p>
<blockquote style="margin: 16px 0; padding: 12px 16px; border-left: 3px solid #dc2626; background: #fef2f2;">${dto.reason}</blockquote>`,
    );

    return { success: true };
  }
}
