import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { BusinessPartnerRole, QuoteStatus } from '@prisma/client';

import { BusinessPartnersService } from '../../business-partners/services/business-partners.service';
import { EmailNotificationsService } from '../../notifications/services/email-notifications.service';
import { WhatsappNotificationsService } from '../../notifications/services/whatsapp-notifications.service';
import { SalesOrderService } from '../../sales-orders/services/sales-order.service';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { attachAuditNames, attachAuditName } from '../../../core/utils/audit-names.util';
import { DocumentSequenceService } from '../../../core/document-sequence/document-sequence.service';

import { buildEmailDocumentSummaryHtml } from '../../../core/utils/email-document-summary.util';

import { QuoteRepository } from '../repositories/quote.repository';
import { QuotePdfService } from './quote-pdf.service';

import { CreateQuoteDto } from '../dto/create-quote.dto';
import { UpdateQuoteDto } from '../dto/update-quote.dto';
import { QuoteFilterDto } from '../dto/quote-filter.dto';

const SEQUENCE_TYPE = 'QUOTE';

@Injectable()
export class QuoteService {
  private readonly logger = new Logger(QuoteService.name);

  constructor(
    private readonly repository: QuoteRepository,
    private readonly prisma: PrismaService,
    private readonly businessPartnersService: BusinessPartnersService,
    private readonly documentSequence: DocumentSequenceService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly whatsappNotifications: WhatsappNotificationsService,
    private readonly salesOrderService: SalesOrderService,
    private readonly quotePdf: QuotePdfService,
  ) {}

  async create(
    companyId: string,
    rootCompanyId: string,
    dto: CreateQuoteDto,
    userId: string,
  ) {
    await this.businessPartnersService.assertHasRole(
      rootCompanyId,
      dto.partnerId,
      BusinessPartnerRole.CUSTOMER,
    );

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, companyId: rootCompanyId },
    });

    if (!warehouse) {
      throw new NotFoundException(
        'Almoxarifado não encontrado.',
      );
    }

    const chartOfAccount = await this.prisma.chartOfAccount.findFirst({
      where: { id: dto.chartOfAccountId, companyId: rootCompanyId },
    });

    if (!chartOfAccount) {
      throw new NotFoundException(
        'Tipo de receita não encontrado.',
      );
    }

    let totalAmount = 0;

    for (const item of dto.items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, companyId: rootCompanyId },
      });

      if (!product) {
        throw new NotFoundException(
          `Produto ${item.productId} não encontrado.`,
        );
      }

      totalAmount += item.quantity * item.unitPrice;
    }

    const netAmount =
      totalAmount -
      (dto.discountValue ?? 0) +
      (dto.freightValue ?? 0) +
      (dto.otherExpenses ?? 0);

    const quote = await this.prisma.$transaction(async (tx) => {
      const number = await this.documentSequence.next(
        tx,
        companyId,
        SEQUENCE_TYPE,
      );

      return this.repository.create(
        tx,
        companyId,
        number,
        dto,
        totalAmount,
        netAmount,
        userId,
      );
    });

    void this.notifyPartner(companyId, quote);

    return quote;
  }

  /**
   * Best-effort: envia o orçamento gerado ao cliente por e-mail/
   * WhatsApp. Nunca lança — ver EmailNotificationsService.send/
   * WhatsappNotificationsService.send.
   */
  private async notifyPartner(
    companyId: string,
    quote: Awaited<ReturnType<QuoteRepository['create']>>,
  ) {
    const partner = quote.partner;

    if (!partner.email && !partner.mobile) {
      return;
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    const companyName =
      company?.tradeName || company?.legalName || 'AlePejo ERP';
    const partnerName = partner.tradeName || partner.legalName;
    const quoteNumber = `ORC-${String(quote.number).padStart(6, '0')}`;
    const value = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(quote.netAmount));

    const formatDate = (value: Date | null) =>
      value
        ? value.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
        : undefined;

    const summaryHtml = buildEmailDocumentSummaryHtml({
      items: quote.items.map((item) => ({
        description: item.product?.description ?? item.productId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      totals: {
        totalAmount: Number(quote.totalAmount),
        discountValue: Number(quote.discountValue),
        freightValue: Number(quote.freightValue),
        otherExpenses: Number(quote.otherExpenses),
        netAmount: Number(quote.netAmount),
      },
      meta: [
        quote.quoteDate && {
          label: 'Data',
          value: formatDate(quote.quoteDate)!,
        },
        quote.validUntil && {
          label: 'Válido até',
          value: formatDate(quote.validUntil)!,
        },
      ].filter((m): m is { label: string; value: string } => Boolean(m)),
    });

    if (partner.email) {
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

      void this.emailNotifications.send(
        companyId,
        partner.email,
        `Orçamento ${quoteNumber} — ${companyName}`,
        `<p>Olá, ${partnerName},</p>
<p>Segue nosso orçamento <strong>${quoteNumber}</strong> de <strong>${companyName}</strong>, no valor de <strong>${value}</strong>.</p>
${summaryHtml}
<p>Qualquer dúvida, estamos à disposição.</p>
<p>Atenciosamente,<br/>${companyName}</p>`,
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
    }

    if (partner.mobile) {
      void this.whatsappNotifications.send(
        companyId,
        partner.mobile,
        `Olá, ${partnerName}! Segue nosso orçamento ${quoteNumber} de ${companyName}, no valor de ${value}. Qualquer dúvida, estamos à disposição.`,
      );
    }
  }

  async findAll(companyId: string, filter: QuoteFilterDto) {
    const quotes = await this.repository.findAll(companyId, filter);

    return attachAuditNames(this.prisma, quotes);
  }

  async findOne(companyId: string, id: string) {
    const quote = await this.repository.findById(
      companyId,
      id,
    );

    if (!quote) {
      throw new NotFoundException(
        'Orçamento não encontrado.',
      );
    }

    return attachAuditName(this.prisma, quote);
  }

  async update(
    companyId: string,
    rootCompanyId: string,
    id: string,
    dto: UpdateQuoteDto,
    userId: string,
  ) {
    const quote = await this.findOne(companyId, id);

    if (
      quote.status !== QuoteStatus.DRAFT &&
      quote.status !== QuoteStatus.REVISION_REQUESTED
    ) {
      throw new BadRequestException(
        'Somente orçamentos em rascunho ou com revisão solicitada pelo cliente podem ser alterados.',
      );
    }

    if (dto.partnerId) {
      await this.businessPartnersService.assertHasRole(
        rootCompanyId,
        dto.partnerId,
        BusinessPartnerRole.CUSTOMER,
      );
    }

    if (dto.warehouseId) {
      const warehouse = await this.prisma.warehouse.findFirst(
        {
          where: { id: dto.warehouseId, companyId: rootCompanyId },
        },
      );

      if (!warehouse) {
        throw new NotFoundException(
          'Almoxarifado não encontrado.',
        );
      }
    }

    if (dto.chartOfAccountId) {
      const chartOfAccount = await this.prisma.chartOfAccount.findFirst(
        {
          where: {
            id: dto.chartOfAccountId,
            companyId: rootCompanyId,
          },
        },
      );

      if (!chartOfAccount) {
        throw new NotFoundException(
          'Tipo de receita não encontrado.',
        );
      }
    }

    let items:
      | {
          productId: string;
          quantity: number;
          unitPrice: number;
          totalPrice: number;
        }[]
      | undefined;

    let totalAmount = Number(quote.totalAmount);

    if (dto.items) {
      totalAmount = 0;

      for (const item of dto.items) {
        const product = await this.prisma.product.findFirst({
          where: { id: item.productId, companyId: rootCompanyId },
        });

        if (!product) {
          throw new NotFoundException(
            `Produto ${item.productId} não encontrado.`,
          );
        }

        totalAmount += item.quantity * item.unitPrice;
      }

      items = dto.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
      }));
    }

    const discountValue =
      dto.discountValue ?? Number(quote.discountValue);
    const freightValue =
      dto.freightValue ?? Number(quote.freightValue);
    const otherExpenses =
      dto.otherExpenses ?? Number(quote.otherExpenses);

    const netAmount =
      totalAmount - discountValue + freightValue + otherExpenses;

    return this.repository.update(
      id,
      {
        partnerId: dto.partnerId,
        warehouseId: dto.warehouseId,
        quoteDate: dto.quoteDate
          ? new Date(dto.quoteDate)
          : undefined,
        validUntil: dto.validUntil
          ? new Date(dto.validUntil)
          : undefined,
        observation: dto.observation,
        discountValue,
        freightValue,
        otherExpenses,
        totalAmount,
        netAmount,
        chartOfAccountId: dto.chartOfAccountId,
        termDays: dto.termDays,
        paymentMethod: dto.paymentMethod,
        installmentsCount: dto.installments?.length ?? dto.installmentsCount,
        plannedInstallments: dto.installments
          ? dto.installments.map((i) => ({
              dueDate: i.dueDate,
              amount: i.amount,
            }))
          : undefined,
        items,
      },
      userId,
    );
  }

  async cancel(companyId: string, id: string, userId: string) {
    const quote = await this.findOne(companyId, id);

    // "Convertido em venda" órfão — o Pedido/Venda que fechou essa
    // conversão foi excluído por fora (ex.: cascata de cancelamento
    // anterior a essa correção), sem devolver o status do orçamento.
    // Sem essa saída, o orçamento ficava travado pra sempre, sem
    // Cancelar nem Estornar disponíveis.
    const orphanedConverted =
      quote.status === QuoteStatus.CONVERTED && !quote.salesOrder;

    const cancellable =
      quote.status === QuoteStatus.DRAFT ||
      quote.status === QuoteStatus.SENT ||
      quote.status === QuoteStatus.REVISION_REQUESTED;

    if (!cancellable && !orphanedConverted) {
      throw new BadRequestException(
        'Somente orçamentos em rascunho, aguardando aprovação do cliente ou com revisão solicitada podem ser cancelados.',
      );
    }

    return this.repository.cancel(id, userId);
  }

  async remove(companyId: string, id: string) {
    const quote = await this.findOne(companyId, id);

    if (quote.status !== QuoteStatus.CANCELLED) {
      throw new BadRequestException(
        'Somente orçamentos cancelados podem ser excluídos.',
      );
    }

    await this.prisma.quote.delete({ where: { id: quote.id } });
  }

  /**
   * Aprovação manual — vendedor confirma na tela que o cliente aceitou
   * (ex.: por telefone/WhatsApp), sem passar pelo link de aprovação
   * digital. Continua disponível mesmo depois que o link foi enviado
   * (SENT) ou depois de um pedido de revisão (REVISION_REQUESTED),
   * como alternativa pro vendedor.
   */
  async approve(
    companyId: string,
    rootCompanyId: string,
    id: string,
    userId: string,
  ) {
    const quote = await this.findOne(companyId, id);

    if (!this.isApprovable(quote.status)) {
      throw new BadRequestException(
        'Somente orçamentos em rascunho, aguardando aprovação do cliente ou com revisão solicitada podem ser aprovados.',
      );
    }

    return this.performApproval(companyId, rootCompanyId, quote, userId);
  }

  isApprovable(status: QuoteStatus) {
    return (
      status === QuoteStatus.DRAFT ||
      status === QuoteStatus.SENT ||
      status === QuoteStatus.REVISION_REQUESTED
    );
  }

  /**
   * Miolo da aprovação — gera o Pedido de Venda sozinho e marca
   * APPROVED. Compartilhado entre `approve()` (aprovação manual, pelo
   * vendedor) e `QuoteConfirmationService.approvePublic()` (aprovação
   * digital, pelo próprio cliente via link — `userId` nesse caso é
   * quem criou o orçamento, já que não há usuário logado).
   */
  async performApproval(
    companyId: string,
    rootCompanyId: string,
    quote: Awaited<ReturnType<QuoteService['findOne']>>,
    userId: string,
  ) {
    const quoteNumber = `ORC-${String(quote.number).padStart(6, '0')}`;
    const generatedNote = `Gerado automaticamente a partir do Orçamento ${quoteNumber}.`;

    const salesOrder = await this.salesOrderService.create(
      companyId,
      rootCompanyId,
      {
        partnerId: quote.partnerId,
        warehouseId: quote.warehouseId,
        orderDate: quote.quoteDate ?? new Date(),
        observation: quote.observation
          ? `${quote.observation}\n\n${generatedNote}`
          : generatedNote,
        discountValue: Number(quote.discountValue),
        freightValue: Number(quote.freightValue),
        otherExpenses: Number(quote.otherExpenses),
        chartOfAccountId: quote.chartOfAccountId ?? undefined,
        termDays: quote.termDays ?? undefined,
        paymentMethod: quote.paymentMethod ?? undefined,
        installmentsCount: quote.installmentsCount ?? undefined,
        // Parcelas planejadas na mão no orçamento (raro — a maioria só
        // define quantidade/prazo) — repassadas aqui, na própria
        // criação, pra já saírem certas no e-mail do Pedido de Venda
        // que o cliente recebe (SalesOrderService.notifyPartner).
        installments: quote.plannedInstallments
          ? (quote.plannedInstallments as unknown as {
              dueDate: string;
              amount: number;
            }[])
          : undefined,
        items: quote.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      },
      userId,
      // Orçamento já aprovado pelo cliente — o Pedido gerado nasce
      // pronto pra virar Venda, sem precisar de aprovação própria.
      true,
    );

    // Vínculo com o orçamento de origem — só referência, não faz parte
    // do DTO de criação do pedido (evita trafegar esse id por dentro
    // de todo o fluxo de validação/produção de SalesOrderService.create).
    await this.prisma.salesOrder.update({
      where: { id: salesOrder.id },
      data: { quoteId: quote.id },
    });

    return this.repository.approve(quote.id, userId);
  }

  /**
   * Desfaz a aprovação — apaga o Pedido de Venda gerado por
   * `approve` e volta o orçamento pra rascunho, pra poder editar e
   * aprovar de novo. Só permitido se esse pedido ainda não virou
   * venda nem gerou ordem de produção (senão a aprovação está
   * "amarrada" num documento posterior).
   */
  async undoApproval(companyId: string, id: string, userId: string) {
    const quote = await this.findOne(companyId, id);

    if (quote.status !== QuoteStatus.APPROVED) {
      throw new BadRequestException(
        'Somente orçamentos aprovados podem ser estornados.',
      );
    }

    const salesOrder = quote.salesOrder;

    if (salesOrder) {
      const linkedSale = await this.prisma.sale.findFirst({
        where: { salesOrderId: salesOrder.id },
      });

      if (linkedSale) {
        throw new BadRequestException(
          'O pedido de venda gerado por este orçamento já virou uma venda — não é possível estornar.',
        );
      }

      const linkedProductionOrder =
        await this.prisma.productionOrder.findFirst({
          where: { salesOrderId: salesOrder.id },
        });

      if (linkedProductionOrder) {
        throw new BadRequestException(
          'O pedido de venda gerado por este orçamento já gerou uma ordem de produção — não é possível estornar.',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (salesOrder) {
        await tx.salesOrder.delete({ where: { id: salesOrder.id } });
      }

      await tx.quote.update({
        where: { id },
        data: { status: QuoteStatus.DRAFT, updatedById: userId },
      });
    });

    return this.findOne(companyId, id);
  }
}
