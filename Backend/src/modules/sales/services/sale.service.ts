import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import {
  BusinessPartnerRole,
  FinancialDocumentType,
  FinancialEntryStatus,
  FinancialEntryType,
  QuoteStatus,
  SalesOrderStatus,
} from '@prisma/client';

import { BusinessPartnersService } from '../../business-partners/services/business-partners.service';
import { FinancialEntriesService } from '../../financial-entries/services/financial-entries.service';
import { ProductionOrdersService } from '../../production/services/production-orders.service';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { calculateAvailableQuantity } from '../../../core/utils/inventory.util';
import { calculateDueDate } from '../../../core/utils/business-day.util';
import { DocumentSequenceService } from '../../../core/document-sequence/document-sequence.service';

import { SaleRepository } from '../repositories/sale.repository';

import { CreateSaleDto } from '../dto/create-sale.dto';
import { UpdateSaleDto } from '../dto/update-sale.dto';
import { SaleFilterDto } from '../dto/sale-filter.dto';
import { ApproveSaleDto } from '../dto/approve-sale.dto';

const SEQUENCE_TYPE = 'SALE';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  BOLETO: 'Boleto',
  CARNE: 'Carnê',
  CUPOM_FISCAL: 'Cupom Fiscal',
  NOTA_FISCAL: 'Nota fiscal',
  RECIBO: 'Recibo',
  OUTRO: 'Outro',
};

function formatSaleNumber(n: number) {
  return `V${String(n).padStart(9, '0')}`;
}

@Injectable()
export class SaleService {
  constructor(
    private readonly repository: SaleRepository,
    private readonly prisma: PrismaService,
    private readonly businessPartnersService: BusinessPartnersService,
    private readonly financialEntriesService: FinancialEntriesService,
    private readonly documentSequence: DocumentSequenceService,
    private readonly productionOrdersService: ProductionOrdersService,
  ) {}

  async create(
    companyId: string,
    dto: CreateSaleDto,
  ) {
    // Valida que o parceiro existe, pertence à empresa e possui o
    // papel de CLIENTE (um fornecedor puro não pode receber venda).
    await this.businessPartnersService.assertHasRole(
      companyId,
      dto.partnerId,
      BusinessPartnerRole.CUSTOMER,
    );

    const warehouse =
      await this.prisma.warehouse.findFirst({
        where: {
          id: dto.warehouseId,
          companyId,
        },
      });

    if (!warehouse) {
      throw new NotFoundException(
        'Almoxarifado não encontrado.',
      );
    }

    let totalAmount = 0;

    for (const item of dto.items) {
      const product =
        await this.prisma.product.findFirst({
          where: {
            id: item.productId,
            companyId,
          },
        });

      if (!product) {
        throw new NotFoundException(
          `Produto ${item.productId} não encontrado.`,
        );
      }

      totalAmount +=
        item.quantity * item.unitPrice;
    }

    const netAmount =
      totalAmount -
      (dto.discountValue ?? 0) +
      (dto.freightValue ?? 0) +
      (dto.otherExpenses ?? 0);

    if (dto.quoteId) {
      const quote = await this.prisma.quote.findFirst({
        where: { id: dto.quoteId, companyId },
      });

      if (!quote) {
        throw new NotFoundException(
          'Orçamento não encontrado.',
        );
      }

      if (quote.status !== QuoteStatus.DRAFT) {
        throw new BadRequestException(
          'Este orçamento já foi convertido em venda ou está cancelado.',
        );
      }
    }

    if (dto.salesOrderId) {
      const order = await this.prisma.salesOrder.findFirst({
        where: { id: dto.salesOrderId, companyId },
      });

      if (!order) {
        throw new NotFoundException(
          'Pedido de venda não encontrado.',
        );
      }

      if (order.status !== SalesOrderStatus.DRAFT) {
        throw new BadRequestException(
          'Este pedido de venda já foi convertido em venda ou está cancelado.',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const number = await this.documentSequence.next(
        tx,
        companyId,
        SEQUENCE_TYPE,
      );

      const sale = await this.repository.create(
        tx,
        companyId,
        number,
        dto,
        totalAmount,
        netAmount,
      );

      if (dto.quoteId) {
        await tx.quote.update({
          where: { id: dto.quoteId },
          data: { status: QuoteStatus.CONVERTED },
        });
      }

      if (dto.salesOrderId) {
        await tx.salesOrder.update({
          where: { id: dto.salesOrderId },
          data: { status: SalesOrderStatus.CONVERTED },
        });
      }

      return sale;
    });
  }

  async findAll(
    companyId: string,
    filter: SaleFilterDto,
  ) {
    return this.repository.findAll(
      companyId,
      filter,
    );
  }

  async findOne(
    companyId: string,
    id: string,
  ) {
    const sale =
      await this.repository.findById(
        companyId,
        id,
      );

    if (!sale) {
      throw new NotFoundException(
        'Venda não encontrada.',
      );
    }

    return sale;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateSaleDto,
  ) {
    const sale = await this.findOne(companyId, id);

    if (sale.status !== 'DRAFT') {
      throw new BadRequestException(
        'Somente vendas em rascunho podem ser alteradas.',
      );
    }

    if (dto.partnerId) {
      await this.businessPartnersService.assertHasRole(
        companyId,
        dto.partnerId,
        BusinessPartnerRole.CUSTOMER,
      );
    }

    if (dto.warehouseId) {
      const warehouse = await this.prisma.warehouse.findFirst({
        where: { id: dto.warehouseId, companyId },
      });

      if (!warehouse) {
        throw new NotFoundException(
          'Almoxarifado não encontrado.',
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

    let totalAmount = Number(sale.totalAmount);

    if (dto.items) {
      totalAmount = 0;

      for (const item of dto.items) {
        const product = await this.prisma.product.findFirst({
          where: { id: item.productId, companyId },
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
      dto.discountValue ?? Number(sale.discountValue);
    const freightValue =
      dto.freightValue ?? Number(sale.freightValue);
    const otherExpenses =
      dto.otherExpenses ?? Number(sale.otherExpenses);

    const netAmount =
      totalAmount - discountValue + freightValue + otherExpenses;

    const saleDate = dto.saleDate
      ? new Date(dto.saleDate)
      : undefined;
    const termDays = dto.termDays;

    const dueDate =
      saleDate !== undefined || termDays !== undefined
        ? calculateDueDate(
            saleDate ?? sale.saleDate ?? new Date(),
            termDays ?? sale.termDays ?? 0,
          )
        : undefined;

    return this.repository.update(id, {
      partnerId: dto.partnerId,
      warehouseId: dto.warehouseId,
      saleDate,
      observation: dto.observation,
      discountValue: dto.discountValue,
      freightValue: dto.freightValue,
      otherExpenses: dto.otherExpenses,
      termDays,
      dueDate,
      paymentMethod: dto.paymentMethod,
      totalAmount,
      netAmount,
      items,
    });
  }

  async approve(
    companyId: string,
    id: string,
    dto: ApproveSaleDto = {},
  ) {
    const sale =
      await this.prisma.sale.findFirst({
        where: {
          id,
          companyId,
        },
        include: {
          items: true,
        },
      });

    if (!sale) {
      throw new NotFoundException(
        'Venda não encontrada.',
      );
    }

    if (sale.status !== 'DRAFT') {
      throw new BadRequestException(
        'Somente vendas em elaboração podem ser aprovadas.',
      );
    }

    const updatedSale = await this.prisma.$transaction(async (tx) => {
      const documentNumber = formatSaleNumber(sale.number);

      // Sem tipo informado, mas com chave de acesso: só pode ser
      // nota fiscal eletrônica.
      const documentType =
        dto.documentType ??
        (dto.invoiceKey
          ? FinancialDocumentType.NOTA_FISCAL
          : undefined);

      const exitObservation = [
        'Saída',
        documentType
          ? DOCUMENT_TYPE_LABELS[documentType]
          : undefined,
        dto.invoiceNumber,
      ]
        .filter(Boolean)
        .join(' ');

      for (const item of sale.items) {
        const inventory =
          await tx.inventory.findFirst({
            where: {
              companyId,
              warehouseId: sale.warehouseId,
              productId: item.productId,
            },
          });

        if (!inventory) {
          throw new BadRequestException(
            `Produto ${item.productId} sem estoque.`,
          );
        }

        const disponivel =
          calculateAvailableQuantity(inventory);
        const quantidade = Number(item.quantity);

        if (disponivel < quantidade) {
          throw new BadRequestException(
            'Estoque disponível insuficiente, verifique (bloqueado, reservado, em quarentena ou avariado não entra na venda).',
          );
        }

        await tx.inventory.update({
          where: {
            id: inventory.id,
          },
          data: {
            quantity: {
              decrement: quantidade,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            companyId,
            inventoryId: inventory.id,
            type: 'EXIT',
            quantity: item.quantity,
            unitCost: inventory.averageCost,
            observation: exitObservation,
            documentNumber,
          },
        });
      }

      const invoiceIssueDate = dto.invoiceIssueDate
        ? new Date(dto.invoiceIssueDate)
        : undefined;

      // Aprovação é quando a nota fiscal de venda é emitida — se
      // vier prazo/forma de pagamento aqui, eles valem mais que o
      // estimado no lançamento, e o vencimento é recalculado a
      // partir da data de emissão da nota (não da data da venda).
      const termDays = dto.termDays ?? sale.termDays ?? 0;
      const paymentMethod =
        dto.paymentMethod ?? sale.paymentMethod;
      const issueDate =
        invoiceIssueDate ?? sale.saleDate ?? new Date();
      const dueDate = calculateDueDate(issueDate, termDays);

      const updated = await tx.sale.update({
        where: {
          id: sale.id,
        },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          invoiceNumber: dto.invoiceNumber,
          invoiceKey: dto.invoiceKey,
          invoiceIssueDate,
          termDays,
          paymentMethod,
          dueDate,
        },
      });

      // Gera automaticamente a conta a receber desta venda, já com
      // os dados fiscais e financeiros informados na aprovação —
      // não precisa entrar em Contas a receber depois para
      // completar vencimento/forma de pagamento.
      await this.financialEntriesService.createFromDocument(
        tx,
        {
          companyId,
          type: FinancialEntryType.RECEIVABLE,
          partnerId: sale.partnerId,
          amount: Number(updated.netAmount),
          issueDate,
          termDays,
          dueDate,
          paymentMethod,
          documentNumber: dto.invoiceNumber,
          documentKey: dto.invoiceKey,
          documentType,
          chartOfAccountId: sale.chartOfAccountId,
          saleId: sale.id,
          observation: `Venda ${sale.id}`,
        },
      );

      return updated;
    });

    // Best-effort: confere se algum item ficou no mínimo/abaixo e
    // gera ordem de produção sozinha — ver
    // ProductionOrdersService.autoGenerateForLowStock (só age se a
    // empresa tiver o módulo PRODUCTION licenciado).
    for (const item of sale.items) {
      void this.productionOrdersService.autoGenerateForLowStock(
        companyId,
        item.productId,
        sale.warehouseId,
      );
    }

    return updatedSale;
  }

  async cancel(
    companyId: string,
    id: string,
  ) {
    const sale = await this.findOne(companyId, id);

    if (sale.status !== 'DRAFT') {
      throw new BadRequestException(
        'Somente vendas em rascunho podem ser canceladas — se já foi aprovada, desfaça a aprovação primeiro.',
      );
    }

    return this.prisma.sale.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async undoApproval(
    companyId: string,
    id: string,
  ) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, companyId },
      include: { items: true, financialEntries: true },
    });

    if (!sale) throw new NotFoundException('Venda não encontrada.');

    if (sale.status === 'INVOICED') {
      throw new BadRequestException('Venda faturada não pode ser cancelada.');
    }

    if (sale.status !== 'APPROVED') {
      throw new BadRequestException('Somente vendas aprovadas podem ser canceladas.');
    }

    const jaRecebido = sale.financialEntries.some(
      (entry) => entry.status === FinancialEntryStatus.PAID,
    );

    if (jaRecebido) {
      throw new BadRequestException(
        'Esta venda já tem recebimento registrado no financeiro. Estorne a baixa antes de desfazer a aprovação.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        const inventory = await tx.inventory.findFirst({
          where: {
            companyId,
            warehouseId: sale.warehouseId,
            productId: item.productId,
          },
        });

        if (!inventory) {
          throw new BadRequestException(`Estoque não encontrado para ${item.productId}.`);
        }

        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: Number(inventory.quantity) + Number(item.quantity),
          },
        });

        await tx.stockMovement.create({
          data: {
            companyId,
            inventoryId: inventory.id,
            type: 'ENTRY',
            quantity: item.quantity,
            unitCost: inventory.averageCost,
            observation: 'Cancelamento da venda',
            documentNumber: formatSaleNumber(sale.number),
          },
        });
      }

      // A conta a receber gerada na aprovação não faz mais sentido
      // se a venda volta a ser rascunho. Se já foi baixada (o cliente
      // já pagou), deixa como está — não é seguro cancelar sozinho.
      await tx.financialEntry.updateMany({
        where: {
          saleId: sale.id,
          status: 'OPEN',
        },
        data: {
          status: 'CANCELLED',
        },
      });

      return tx.sale.update({
        where: { id: sale.id },
        data: {
          status: 'DRAFT',
          approvedAt: null,
        },
      });
    });
  }

}
