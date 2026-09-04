import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { BusinessPartnerRole, ServiceOrderStatus } from '@prisma/client';

import { BusinessPartnersService } from '../../business-partners/services/business-partners.service';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { attachAuditNames, attachAuditName } from '../../../core/utils/audit-names.util';
import { DocumentSequenceService } from '../../../core/document-sequence/document-sequence.service';
import {
  buildTwoGroupEmailSummaryHtml,
  type EmailSummaryPaymentTerms,
} from '../../../core/utils/email-document-summary.util';
import { buildAutoInstallments } from '../../../core/utils/installment.util';
import { calculateDueDate } from '../../../core/utils/business-day.util';

import { ServiceOrderRepository } from '../repositories/service-order.repository';

import { CreateServiceOrderDto } from '../dto/create-service-order.dto';
import { UpdateServiceOrderDto } from '../dto/update-service-order.dto';
import { ServiceOrderFilterDto } from '../dto/service-order-filter.dto';

const SEQUENCE_TYPE = 'SERVICE_ORDER';

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

function serviceOrderNumberOf(order: { number: number }): string {
  return `OS-${String(order.number).padStart(6, '0')}`;
}

@Injectable()
export class ServiceOrderService {
  constructor(
    private readonly repository: ServiceOrderRepository,
    private readonly prisma: PrismaService,
    private readonly businessPartnersService: BusinessPartnersService,
    private readonly documentSequence: DocumentSequenceService,
  ) {}

  async create(
    companyId: string,
    rootCompanyId: string,
    dto: CreateServiceOrderDto,
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
      throw new NotFoundException('Almoxarifado não encontrado.');
    }

    const chartOfAccount = await this.prisma.chartOfAccount.findFirst({
      where: { id: dto.chartOfAccountId, companyId: rootCompanyId },
    });

    if (!chartOfAccount) {
      throw new NotFoundException('Tipo de receita não encontrado.');
    }

    if (dto.quoteId) {
      const quote = await this.prisma.quote.findFirst({
        where: { id: dto.quoteId, companyId },
      });

      if (!quote) {
        throw new NotFoundException('Orçamento não encontrado.');
      }

      // Orçamento aceito direto (sem passar por Pedido) já virou uma
      // Venda de produto (ver Quote.status no schema) — não pode
      // também gerar uma Ordem de Serviço, senão o mesmo orçamento
      // vira duas operações diferentes.
      if (quote.status === 'CONVERTED') {
        throw new BadRequestException(
          'Este orçamento já foi convertido em venda — não pode ser usado para gerar Ordem de Serviço.',
        );
      }
    }

    if (dto.serviceItems.length === 0 && dto.productItems.length === 0) {
      throw new BadRequestException(
        'Informe ao menos um serviço realizado ou produto usado.',
      );
    }

    let totalAmount = 0;

    for (const item of [...dto.serviceItems, ...dto.productItems]) {
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
      );
    });

    return order;
  }

  /**
   * Mesma ideia de `SalesOrderService.buildPaymentTerms` — resumo pro
   * cliente ver o que ficou combinado. Público porque
   * `ServiceOrderPdfService` também usa (formulário impresso mostra
   * forma de pagamento e parcelas, quando houver).
   */
  buildPaymentTerms(
    order: Awaited<ReturnType<ServiceOrderRepository['create']>>,
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

    const issueDate = new Date();
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
   * Resumo em HTML com os dois grupos de item separados (serviços/
   * produtos) — usado tanto no aviso de criação quanto reaproveitado
   * pelo e-mail de confirmação (ver ServiceOrderConfirmationService).
   */
  buildSummaryHtml(
    order: Awaited<ReturnType<ServiceOrderRepository['create']>>,
  ): string {
    return buildTwoGroupEmailSummaryHtml({
      groups: [
        {
          title: 'Serviços Realizados',
          items: order.serviceItems.map((item) => ({
            description: item.product?.description ?? item.productId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
          })),
        },
        {
          title: 'Produtos e Materiais Usados',
          items: order.productItems.map((item) => ({
            description: item.product?.description ?? item.productId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
          })),
        },
      ],
      totals: {
        totalAmount: Number(order.totalAmount),
        discountValue: Number(order.discountValue),
        freightValue: Number(order.freightValue),
        otherExpenses: Number(order.otherExpenses),
        netAmount: Number(order.netAmount),
      },
      paymentTerms: this.buildPaymentTerms(order),
    });
  }

  async findAll(companyId: string, filter: ServiceOrderFilterDto) {
    const orders = await this.repository.findAll(companyId, filter);

    return attachAuditNames(this.prisma, orders);
  }

  async findOne(companyId: string, id: string) {
    const order = await this.repository.findById(companyId, id);

    if (!order) {
      throw new NotFoundException('Ordem de serviço não encontrada.');
    }

    return attachAuditName(this.prisma, order);
  }

  async update(
    companyId: string,
    rootCompanyId: string,
    id: string,
    dto: UpdateServiceOrderDto,
    userId: string,
  ) {
    const order = await this.findOne(companyId, id);

    if (
      order.status !== ServiceOrderStatus.DRAFT &&
      order.status !== ServiceOrderStatus.IN_PROGRESS &&
      order.status !== ServiceOrderStatus.REVISION_REQUESTED
    ) {
      throw new BadRequestException(
        'Somente ordens de serviço em aberto, em execução ou com revisão solicitada podem ser alteradas.',
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
      const warehouse = await this.prisma.warehouse.findFirst({
        where: { id: dto.warehouseId, companyId: rootCompanyId },
      });

      if (!warehouse) {
        throw new NotFoundException('Almoxarifado não encontrado.');
      }
    }

    if (dto.chartOfAccountId) {
      const chartOfAccount = await this.prisma.chartOfAccount.findFirst({
        where: { id: dto.chartOfAccountId, companyId: rootCompanyId },
      });

      if (!chartOfAccount) {
        throw new NotFoundException('Tipo de receita não encontrado.');
      }
    }

    let serviceItems:
      | {
          productId: string;
          description?: string;
          quantity: number;
          unitPrice: number;
          totalPrice: number;
        }[]
      | undefined;

    let productItems:
      | {
          productId: string;
          quantity: number;
          unitPrice: number;
          totalPrice: number;
        }[]
      | undefined;

    let totalAmount = Number(order.totalAmount);

    if (dto.serviceItems || dto.productItems) {
      const nextServiceItems = dto.serviceItems ?? [];
      const nextProductItems = dto.productItems ?? [];

      totalAmount = 0;

      for (const item of [...nextServiceItems, ...nextProductItems]) {
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

      if (dto.serviceItems) {
        serviceItems = dto.serviceItems.map((item) => ({
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
        }));
      }

      if (dto.productItems) {
        productItems = dto.productItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
        }));
      }
    }

    const discountValue = dto.discountValue ?? Number(order.discountValue);
    const freightValue = dto.freightValue ?? Number(order.freightValue);
    const otherExpenses = dto.otherExpenses ?? Number(order.otherExpenses);

    const netAmount =
      totalAmount - discountValue + freightValue + otherExpenses;

    return this.repository.update(
      id,
      {
        partnerId: dto.partnerId,
        warehouseId: dto.warehouseId,
        description: dto.description,
        scheduledStart: dto.scheduledStart
          ? new Date(dto.scheduledStart)
          : undefined,
        scheduledEnd: dto.scheduledEnd
          ? new Date(dto.scheduledEnd)
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
        serviceItems,
        productItems,
      },
      userId,
    );
  }

  async startExecution(companyId: string, id: string, userId: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== ServiceOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Somente ordens de serviço em aberto podem iniciar execução.',
      );
    }

    return this.repository.updateStatus(
      id,
      ServiceOrderStatus.IN_PROGRESS,
      userId,
    );
  }

  async cancel(companyId: string, id: string, userId: string) {
    const order = await this.findOne(companyId, id);

    const cancellable =
      order.status === ServiceOrderStatus.DRAFT ||
      order.status === ServiceOrderStatus.IN_PROGRESS ||
      order.status === ServiceOrderStatus.AWAITING_CONFIRMATION ||
      order.status === ServiceOrderStatus.REVISION_REQUESTED;

    if (!cancellable) {
      throw new BadRequestException(
        'Somente ordens de serviço ainda não confirmadas pelo cliente podem ser canceladas.',
      );
    }

    return this.repository.updateStatus(
      id,
      ServiceOrderStatus.CANCELLED,
      userId,
    );
  }

  async remove(companyId: string, id: string) {
    const order = await this.findOne(companyId, id);

    if (order.status !== ServiceOrderStatus.CANCELLED) {
      throw new BadRequestException(
        'Somente ordens de serviço canceladas podem ser excluídas.',
      );
    }

    await this.repository.remove(id);
  }
}

export { serviceOrderNumberOf };
