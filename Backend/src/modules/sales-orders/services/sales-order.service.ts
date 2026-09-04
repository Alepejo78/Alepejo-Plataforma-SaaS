import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  BusinessPartnerRole,
  Prisma,
  SalesOrderStatus,
} from '@prisma/client';

import { BusinessPartnersService } from '../../business-partners/services/business-partners.service';
import { EmailNotificationsService } from '../../notifications/services/email-notifications.service';
import { WhatsappNotificationsService } from '../../notifications/services/whatsapp-notifications.service';
import { ProductionOrdersService } from '../../production/services/production-orders.service';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { attachAuditNames, attachAuditName } from '../../../core/utils/audit-names.util';
import { DocumentSequenceService } from '../../../core/document-sequence/document-sequence.service';
import {
  buildEmailDocumentSummaryHtml,
  type EmailSummaryPaymentTerms,
} from '../../../core/utils/email-document-summary.util';
import { buildAutoInstallments } from '../../../core/utils/installment.util';
import { calculateDueDate } from '../../../core/utils/business-day.util';

import { SalesOrderRepository } from '../repositories/sales-order.repository';

import { CreateSalesOrderDto } from '../dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from '../dto/update-sales-order.dto';
import { SalesOrderFilterDto } from '../dto/sales-order-filter.dto';

const SEQUENCE_TYPE = 'SALES_ORDER';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  BOLETO: 'Boleto',
  TRANSFERENCIA: 'Transferência',
  DEPOSITO: 'Depósito',
  DEBITO: 'Débito',
  CREDITO: 'Crédito',
  CHEQUE: 'Cheque',
  DESCONTO_NF: 'Desconto NF',
  OUTRO: 'Outro',
};

function formatDueDate(value: Date | string): string {
  return new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

@Injectable()
export class SalesOrderService {
  constructor(
    private readonly repository: SalesOrderRepository,
    private readonly prisma: PrismaService,
    private readonly businessPartnersService: BusinessPartnersService,
    private readonly documentSequence: DocumentSequenceService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly whatsappNotifications: WhatsappNotificationsService,
    private readonly productionOrdersService: ProductionOrdersService,
  ) {}

  async create(
    companyId: string,
    rootCompanyId: string,
    dto: CreateSalesOrderDto,
    userId: string,
    autoApprove = false,
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

    const order = await this.prisma.$transaction(async (tx) => {
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
        autoApprove ? new Date() : undefined,
      );
    });

    void this.notifyPartner(companyId, order);

    // Best-effort: gera ordem de produção sozinha se algum item pedir
    // mais do que o saldo disponível — ver
    // ProductionOrdersService.autoGenerateForSalesOrderItem (só age
    // se a empresa tiver o módulo PRODUCTION licenciado).
    for (const item of order.items) {
      void this.productionOrdersService.autoGenerateForSalesOrderItem(
        companyId,
        {
          productId: item.productId,
          warehouseId: order.warehouseId,
          requestedQuantity: Number(item.quantity),
          salesOrderId: order.id,
        },
      );
    }

    return order;
  }

  /**
   * Forma de pagamento e parcelas que ficaram combinadas no pedido —
   * pro cliente ver, no e-mail, exatamente o que ele aprovou. Usa as
   * parcelas planejadas na mão quando existirem (raro); senão, calcula
   * uma prévia com a mesma regra que a Venda vai usar de verdade na
   * aprovação (ver `buildAutoInstallments`) — só pra exibição, nada é
   * gravado aqui.
   */
  private buildPaymentTerms(
    order: Awaited<ReturnType<SalesOrderRepository['create']>>,
  ): EmailSummaryPaymentTerms | undefined {
    if (!order.paymentMethod && !order.termDays) {
      return undefined;
    }

    const methodLabel = order.paymentMethod
      ? PAYMENT_METHOD_LABELS[order.paymentMethod]
      : undefined;

    const planned = Array.isArray(order.plannedInstallments)
      ? (order.plannedInstallments as unknown as {
          dueDate: string;
          amount: number;
        }[])
      : null;

    if (planned && planned.length > 0) {
      return {
        methodLabel,
        installments: planned.map((row) => ({
          dueDate: formatDueDate(row.dueDate),
          amount: Number(row.amount),
        })),
      };
    }

    const issueDate = order.orderDate ?? new Date();
    const termDays = order.termDays ?? 0;
    const count = order.installmentsCount ?? 1;

    if (count > 1) {
      const preview = buildAutoInstallments(
        issueDate,
        termDays,
        count,
        Number(order.netAmount),
      );

      return {
        methodLabel,
        installments: preview.map((row) => ({
          dueDate: formatDueDate(row.dueDate),
          amount: row.amount,
        })),
      };
    }

    return {
      methodLabel,
      installments: [
        {
          dueDate: formatDueDate(calculateDueDate(issueDate, termDays)),
          amount: Number(order.netAmount),
        },
      ],
    };
  }

  /**
   * Best-effort: envia o pedido de venda gerado ao cliente por
   * e-mail/WhatsApp. Nunca lança — ver EmailNotificationsService.send/
   * WhatsappNotificationsService.send.
   */
  private async notifyPartner(
    companyId: string,
    order: Awaited<ReturnType<SalesOrderRepository['create']>>,
  ) {
    const partner = order.partner;

    if (!partner.email && !partner.mobile) {
      return;
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    const companyName =
      company?.tradeName || company?.legalName || 'AlePejo ERP';
    const partnerName = partner.tradeName || partner.legalName;
    const orderNumber = `PV-${String(order.number).padStart(6, '0')}`;
    const value = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(order.netAmount));

    const summaryHtml = buildEmailDocumentSummaryHtml({
      items: order.items.map((item) => ({
        description: item.product?.description ?? item.productId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      totals: {
        totalAmount: Number(order.totalAmount),
        discountValue: Number(order.discountValue),
        freightValue: Number(order.freightValue),
        otherExpenses: Number(order.otherExpenses),
        netAmount: Number(order.netAmount),
      },
      meta: order.orderDate
        ? [
            {
              label: 'Data',
              value: order.orderDate.toLocaleDateString('pt-BR', {
                timeZone: 'UTC',
              }),
            },
          ]
        : undefined,
      paymentTerms: this.buildPaymentTerms(order),
    });

    if (partner.email) {
      void this.emailNotifications.send(
        companyId,
        partner.email,
        `Pedido de Venda ${orderNumber} — ${companyName}`,
        `<p>Olá, ${partnerName},</p>
<p>Segue nosso Pedido de Venda <strong>${orderNumber}</strong> de <strong>${companyName}</strong>, no valor de <strong>${value}</strong>.</p>
${summaryHtml}
<p>Qualquer dúvida, estamos à disposição.</p>
<p>Atenciosamente,<br/>${companyName}</p>`,
      );
    }

    if (partner.mobile) {
      void this.whatsappNotifications.send(
        companyId,
        partner.mobile,
        `Olá, ${partnerName}! Segue nosso Pedido de Venda ${orderNumber} de ${companyName}, no valor de ${value}. Qualquer dúvida, estamos à disposição.`,
      );
    }
  }

  async findAll(
    companyId: string,
    filter: SalesOrderFilterDto,
  ) {
    const orders = await this.repository.findAll(companyId, filter);

    return attachAuditNames(this.prisma, orders);
  }

  async findOne(companyId: string, id: string) {
    const order = await this.repository.findById(
      companyId,
      id,
    );

    if (!order) {
      throw new NotFoundException(
        'Pedido de venda não encontrado.',
      );
    }

    return attachAuditName(this.prisma, order);
  }

  async update(
    companyId: string,
    rootCompanyId: string,
    id: string,
    dto: UpdateSalesOrderDto,
    userId: string,
  ) {
    const order = await this.findOne(companyId, id);

    if (order.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Somente pedidos em rascunho podem ser alterados.',
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

    let totalAmount = Number(order.totalAmount);

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
      dto.discountValue ?? Number(order.discountValue);
    const freightValue =
      dto.freightValue ?? Number(order.freightValue);
    const otherExpenses =
      dto.otherExpenses ?? Number(order.otherExpenses);

    const netAmount =
      totalAmount - discountValue + freightValue + otherExpenses;

    return this.repository.update(
      id,
      {
        partnerId: dto.partnerId,
        warehouseId: dto.warehouseId,
        orderDate: dto.orderDate
          ? new Date(dto.orderDate)
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

  /**
   * Volta o Orçamento de origem pra rascunho, pra poder editar/
   * aprovar/cancelar de novo — chamado quando o Pedido que ele gerou
   * automaticamente é cancelado, estornado ou excluído (o pedido não
   * está mais "pronto" nesse ponto, então o orçamento também deixa de
   * estar).
   */
  private async revertLinkedQuote(
    tx: Prisma.TransactionClient,
    quoteId: string,
    userId: string,
  ) {
    await tx.quote.update({
      where: { id: quoteId },
      data: { status: 'DRAFT', updatedById: userId },
    });
  }

  /**
   * Mesmo raciocínio de `revertLinkedQuote` acima, pro Pedido nascido
   * da confirmação digital de uma Ordem de Serviço (ver
   * ServiceOrderConfirmationService.confirmPublic) — volta a Ordem de
   * Serviço pra IN_PROGRESS, pra poder enviar a confirmação de novo.
   */
  private async revertLinkedServiceOrder(
    tx: Prisma.TransactionClient,
    serviceOrderId: string,
    userId: string,
  ) {
    await tx.serviceOrder.update({
      where: { id: serviceOrderId },
      data: { status: 'IN_PROGRESS', updatedById: userId },
    });
  }

  async cancel(companyId: string, id: string, userId: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== SalesOrderStatus.DRAFT || order.approvedAt) {
      throw new BadRequestException(
        'Somente pedidos em rascunho e ainda não aprovados podem ser cancelados — se já foi aprovado, estorne a aprovação primeiro.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.salesOrder.update({
        where: { id },
        data: { status: 'CANCELLED', updatedById: userId },
      });

      if (order.quoteId) {
        await this.revertLinkedQuote(tx, order.quoteId, userId);
      }

      if (order.serviceOrderId) {
        await this.revertLinkedServiceOrder(tx, order.serviceOrderId, userId);
      }

      return cancelled;
    });
  }

  async approve(companyId: string, id: string, userId: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Somente pedidos em rascunho podem ser aprovados.',
      );
    }

    if (order.approvedAt) {
      throw new BadRequestException('Este pedido já está aprovado.');
    }

    const approved = await this.repository.approve(id, userId);

    // Pedido pode ter sido ajustado entre o lançamento e a aprovação
    // — o cliente precisa ver de novo o que ficou combinado, já
    // confirmado.
    void this.notifyPartner(companyId, await this.findOne(companyId, id));

    return approved;
  }

  /**
   * Desfaz a aprovação — só permitido enquanto nada foi convertido em
   * Venda ainda (senão a aprovação está "amarrada" num documento
   * posterior). Se o pedido nasceu de um Orçamento, o orçamento volta
   * pra rascunho junto.
   */
  async undoApproval(companyId: string, id: string, userId: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== SalesOrderStatus.DRAFT || !order.approvedAt) {
      throw new BadRequestException(
        'Somente pedidos aprovados e ainda sem nenhuma venda gerada podem ser estornados.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const reverted = await tx.salesOrder.update({
        where: { id },
        data: { approvedAt: null, updatedById: userId },
      });

      if (order.quoteId) {
        await this.revertLinkedQuote(tx, order.quoteId, userId);
      }

      if (order.serviceOrderId) {
        await this.revertLinkedServiceOrder(tx, order.serviceOrderId, userId);
      }

      return reverted;
    });
  }

  async remove(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== SalesOrderStatus.CANCELLED) {
      throw new BadRequestException(
        'Só pedidos cancelados podem ser excluídos.',
      );
    }

    await this.repository.remove(id);
  }

  /**
   * Fecha o pedido sem gerar venda nenhuma pra sobra — usado quando o
   * saldo que restou (entregue parcialmente, ex.: cliente não vai
   * mais levar o resto) não vai mais ser convertido.
   */
  async closeBalance(companyId: string, id: string, userId: string) {
    const order = await this.findOne(companyId, id);

    if (
      order.status !== SalesOrderStatus.DRAFT &&
      order.status !== SalesOrderStatus.PARTIALLY_CONVERTED
    ) {
      throw new BadRequestException(
        'Este pedido não tem saldo em aberto pra zerar.',
      );
    }

    if (!order.approvedAt) {
      throw new BadRequestException('Este pedido ainda não foi aprovado.');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        // Descarta só o saldo que sobrou — não mexe em
        // convertedQuantity, que é reservado pra venda de verdade.
        // Sem essa distinção, a tela mostraria "convertido" pra
        // quantidade que na real foi só desistida.
        const saldo = Number(item.quantity) - Number(item.convertedQuantity);

        if (saldo <= 0) continue;

        await tx.salesOrderItem.update({
          where: { id: item.id },
          data: { discardedQuantity: saldo },
        });
      }

      await tx.salesOrder.update({
        where: { id },
        data: {
          status: SalesOrderStatus.CONVERTED,
          updatedById: userId,
        },
      });
    });

    return this.findOne(companyId, id);
  }
}
