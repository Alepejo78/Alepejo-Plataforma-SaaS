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
  InventoryControl,
  PaymentMethod,
  Prisma,
  QuoteStatus,
  SalesOrderStatus,
} from '@prisma/client';

import { BusinessPartnersService } from '../../business-partners/services/business-partners.service';
import { FinancialEntriesService } from '../../financial-entries/services/financial-entries.service';
import { ProductionOrdersService } from '../../production/services/production-orders.service';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { calculateAvailableQuantity } from '../../../core/utils/inventory.util';
import { calculateDueDate } from '../../../core/utils/business-day.util';
import { buildAutoInstallments } from '../../../core/utils/installment.util';
import { attachAuditNames, attachAuditName } from '../../../core/utils/audit-names.util';
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

  /**
   * Nota fiscal de um mesmo cliente não pode entrar duas vezes —
   * evita duplicidade (ex.: importar o mesmo XML duas vezes por
   * engano). Números iguais de clientes DIFERENTES são normais (cada
   * um numera do jeito dele), por isso o cheque é sempre por cliente,
   * nunca isolado. Venda cancelada não conta — se a primeira
   * tentativa foi cancelada, pode lançar de novo.
   */
  private async assertInvoiceNumberNotDuplicated(
    companyId: string,
    partnerId: string,
    invoiceNumber: string,
    excludeId?: string,
  ) {
    const duplicate = await this.prisma.sale.findFirst({
      where: {
        companyId,
        partnerId,
        invoiceNumber,
        status: { not: 'CANCELLED' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    if (duplicate) {
      throw new BadRequestException(
        `Já existe uma venda com a nota fiscal ${invoiceNumber} lançada para este cliente.`,
      );
    }
  }

  /**
   * Enquanto um produto está numa Contagem de Inventário em aberto
   * (rascunho) neste depósito, aprovação/estorno de venda desse
   * produto fica bloqueado — senão a movimentação furaria a
   * contagem por baixo, invalidando o que já foi contado.
   */
  private async assertNoOpenInventoryCount(
    warehouseId: string,
    productIds: string[],
  ) {
    if (productIds.length === 0) {
      return;
    }

    const openItem = await this.prisma.inventoryCountItem.findFirst({
      where: {
        productId: { in: productIds },
        inventoryCount: {
          warehouseId,
          status: { in: ['OPEN', 'COUNTING', 'FINALIZED'] },
        },
      },
      include: { product: true, inventoryCount: true },
    });

    if (openItem) {
      const number = `INV-${String(openItem.inventoryCount.number).padStart(6, '0')}`;

      throw new BadRequestException(
        `Produto ${openItem.product.description} está em contagem de inventário em aberto (${number}) neste depósito — finalize ou cancele a contagem antes de continuar.`,
      );
    }
  }

  async create(
    companyId: string,
    rootCompanyId: string,
    dto: CreateSaleDto,
    userId: string,
  ) {
    // Valida que o parceiro existe, pertence à empresa e possui o
    // papel de CLIENTE (um fornecedor puro não pode receber venda) —
    // cadastro de grupo (Interprise), checa pela raiz do grupo.
    await this.businessPartnersService.assertHasRole(
      rootCompanyId,
      dto.partnerId,
      BusinessPartnerRole.CUSTOMER,
    );

    const warehouse =
      await this.prisma.warehouse.findFirst({
        where: {
          id: dto.warehouseId,
          companyId: rootCompanyId,
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
            companyId: rootCompanyId,
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

    let sourceOrder: {
      quoteId: string | null;
      chartOfAccountId: string | null;
      termDays: number | null;
      paymentMethod: PaymentMethod | null;
      installmentsCount: number | null;
      plannedInstallments: unknown;
      items: { id: string; productId: string }[];
    } | null = null;

    // Quanto está sendo lançado agora, por produto — usado pra
    // conferir o saldo do pedido e, depois, pra somar no
    // convertedQuantity de cada item dele.
    const requestedByProduct = new Map<string, number>();
    for (const item of dto.items) {
      requestedByProduct.set(
        item.productId,
        (requestedByProduct.get(item.productId) ?? 0) + item.quantity,
      );
    }

    if (dto.salesOrderId) {
      const order = await this.prisma.salesOrder.findFirst({
        where: { id: dto.salesOrderId, companyId },
        include: { items: true },
      });

      if (!order) {
        throw new NotFoundException(
          'Pedido de venda não encontrado.',
        );
      }

      if (
        order.status !== SalesOrderStatus.DRAFT &&
        order.status !== SalesOrderStatus.PARTIALLY_CONVERTED
      ) {
        throw new BadRequestException(
          'Este pedido de venda já foi totalmente convertido em venda ou está cancelado.',
        );
      }

      if (!order.approvedAt) {
        throw new BadRequestException(
          'Este pedido de venda ainda não foi aprovado.',
        );
      }

      // Confere que a quantidade lançada agora não estoura o saldo
      // disponível (pedida - já convertida) de cada produto do
      // pedido. Item da venda que não bate com nenhum item do
      // pedido (lançado à parte) passa direto, sem afetar saldo.
      for (const orderItem of order.items) {
        const requested = requestedByProduct.get(orderItem.productId);
        if (!requested) continue;

        const saldo =
          Number(orderItem.quantity) -
          Number(orderItem.convertedQuantity) -
          Number(orderItem.discardedQuantity);

        if (requested > saldo + 0.0001) {
          const product = await this.prisma.product.findUnique({
            where: { id: orderItem.productId },
            select: { description: true },
          });
          throw new BadRequestException(
            `Saldo insuficiente no pedido de venda: ${product?.description ?? 'produto'} tem ${saldo} disponível, você está lançando ${requested}.`,
          );
        }
      }

      sourceOrder = order;
    }

    // Prazo/forma de pagamento/parcelas/tipo de receita: se a tela
    // mandou um valor, vale; senão, herda do pedido de venda de
    // origem.
    const effectiveDto: CreateSaleDto = {
      ...dto,
      chartOfAccountId:
        dto.chartOfAccountId ??
        sourceOrder?.chartOfAccountId ??
        undefined,
      termDays: dto.termDays ?? sourceOrder?.termDays ?? undefined,
      paymentMethod:
        dto.paymentMethod ??
        sourceOrder?.paymentMethod ??
        undefined,
      installmentsCount:
        dto.installmentsCount ??
        sourceOrder?.installmentsCount ??
        undefined,
      installments: dto.installments?.length
        ? dto.installments
        : Array.isArray(sourceOrder?.plannedInstallments) &&
            sourceOrder.plannedInstallments.length > 0
          ? sourceOrder.plannedInstallments
          : undefined,
    };

    // Venda não passa mais por uma etapa de aprovação separada — ao
    // ser lançada, já é porque o faturamento aconteceu de verdade, e
    // create() já faz o que approve() faz (baixa estoque, gera
    // título). Mesmas checagens que approve() faz antes de começar.
    await this.assertNoOpenInventoryCount(
      dto.warehouseId,
      dto.items.map((item) => item.productId),
    );

    if (dto.invoiceNumber) {
      await this.assertInvoiceNumberNotDuplicated(
        companyId,
        dto.partnerId,
        dto.invoiceNumber,
      );
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
        effectiveDto,
        totalAmount,
        netAmount,
        userId,
      );

      // Pedido nascido da aprovação de um Orçamento (ver
      // QuoteService.approve) — fecha o status do Orçamento junto,
      // já que a Venda não nasce mais direto dele.
      if (sourceOrder?.quoteId) {
        await tx.quote.update({
          where: { id: sourceOrder.quoteId },
          data: { status: QuoteStatus.CONVERTED },
        });
      }

      if (dto.salesOrderId && sourceOrder) {
        for (const [productId, requested] of requestedByProduct) {
          const orderItem = sourceOrder.items.find(
            (item) => item.productId === productId,
          );
          if (!orderItem) continue;

          await tx.salesOrderItem.update({
            where: { id: orderItem.id },
            data: { convertedQuantity: { increment: requested } },
          });
        }

        const updatedItems = await tx.salesOrderItem.findMany({
          where: { salesOrderId: dto.salesOrderId },
        });

        const allConverted = updatedItems.every(
          (item) =>
            Number(item.quantity) -
              Number(item.convertedQuantity) -
              Number(item.discardedQuantity) <=
            0.0001,
        );
        const anyConverted = updatedItems.some(
          (item) =>
            Number(item.convertedQuantity) > 0.0001 ||
            Number(item.discardedQuantity) > 0.0001,
        );

        await tx.salesOrder.update({
          where: { id: dto.salesOrderId },
          data: {
            status: allConverted
              ? SalesOrderStatus.CONVERTED
              : anyConverted
                ? SalesOrderStatus.PARTIALLY_CONVERTED
                : SalesOrderStatus.DRAFT,
          },
        });
      }

      return this.applyApproval(
        tx,
        companyId,
        sale,
        effectiveDto,
        userId,
      );
    });
  }

  async findAll(
    companyId: string,
    filter: SaleFilterDto,
  ) {
    const sales = await this.repository.findAll(
      companyId,
      filter,
    );

    return attachAuditNames(this.prisma, sales);
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

    return attachAuditName(this.prisma, sale);
  }

  async update(
    companyId: string,
    rootCompanyId: string,
    id: string,
    dto: UpdateSaleDto,
    userId: string,
  ) {
    const sale = await this.findOne(companyId, id);

    if (sale.status !== 'DRAFT' && sale.status !== 'APPROVED') {
      throw new BadRequestException(
        'Esta venda não pode ser alterada.',
      );
    }

    const hasPaidEntry = sale.financialEntries.some(
      (entry) => entry.status === FinancialEntryStatus.PAID,
    );

    if (hasPaidEntry) {
      throw new BadRequestException(
        'Este título já foi baixado no financeiro — estorne a baixa antes de editar.',
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
        throw new NotFoundException(
          'Almoxarifado não encontrado.',
        );
      }
    }

    // Venda vinculada a um pedido consome saldo dele na criação — se
    // deixasse editar os itens depois, o saldo do pedido ficaria
    // inconsistente. Cancele e lance de novo se precisar corrigir.
    // Parcelas/vencimento não mexem no saldo do pedido, então só trava
    // quando produto/quantidade/preço realmente mudou — não só porque
    // o payload de edição sempre reenvia a lista de itens.
    const itemsChanged =
      !!dto.items &&
      (dto.items.length !== sale.items.length ||
        !dto.items.every((item) => {
          const current = sale.items.find(
            (existing) => existing.productId === item.productId,
          );

          return (
            current &&
            Number(current.quantity) === item.quantity &&
            Number(current.unitPrice) === item.unitPrice
          );
        }));

    if (itemsChanged && sale.salesOrderId) {
      throw new BadRequestException(
        'Esta venda está vinculada a um pedido de venda — o produto e a quantidade dos itens não podem ser alterados (parcelas e vencimento podem). Cancele e lance de novo se precisar corrigir produto/quantidade.',
      );
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

    // Venda já aprovada (baixou estoque e gerou título) só precisa
    // desfazer/refazer isso quando o campo alterado de fato afeta o
    // estoque ou o título gerado — observação/nota fiscal/etc. seguem
    // como atualização simples, sem esse vaivém.
    const financialFieldsChanged =
      sale.status === 'APPROVED' &&
      (itemsChanged ||
        dto.discountValue !== undefined ||
        dto.freightValue !== undefined ||
        dto.otherExpenses !== undefined ||
        dto.termDays !== undefined ||
        dto.paymentMethod !== undefined ||
        dto.installments !== undefined ||
        dto.installmentsCount !== undefined ||
        dto.chartOfAccountId !== undefined);

    const updateData = {
      partnerId: dto.partnerId,
      warehouseId: dto.warehouseId,
      saleDate,
      observation: dto.observation,
      chartOfAccountId: dto.chartOfAccountId,
      discountValue: dto.discountValue,
      freightValue: dto.freightValue,
      otherExpenses: dto.otherExpenses,
      termDays,
      dueDate,
      paymentMethod: dto.paymentMethod,
      installmentsCount: dto.installments?.length ?? dto.installmentsCount,
      plannedInstallments: dto.installments
        ? dto.installments.map((i) => ({
            dueDate: i.dueDate,
            amount: i.amount,
          }))
        : undefined,
      invoiceNumber: dto.invoiceNumber,
      invoiceKey: dto.invoiceKey,
      totalAmount,
      netAmount,
      items,
    };

    if (!financialFieldsChanged) {
      return this.repository.update(id, updateData, userId);
    }

    const affectedProductIds = dto.items
      ? dto.items.map((item) => item.productId)
      : sale.items.map((item: { productId: string }) => item.productId);

    await this.assertNoOpenInventoryCount(
      dto.warehouseId ?? sale.warehouseId,
      affectedProductIds,
    );

    if (dto.invoiceNumber) {
      await this.assertInvoiceNumberNotDuplicated(
        companyId,
        dto.partnerId ?? sale.partnerId,
        dto.invoiceNumber,
        sale.id,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await this.revertApproval(tx, companyId, sale, userId);

      const reloaded = await this.repository.update(
        id,
        updateData,
        userId,
        tx,
      );

      return this.applyApproval(
        tx,
        companyId,
        reloaded,
        dto,
        userId,
      );
    });
  }

  /**
   * Baixa o estoque dos itens e gera o(s) título(s) a receber — corpo
   * de transação reaproveitado tanto por `create()` (a venda já nasce
   * "aprovada", sem etapa própria) quanto por `approve()` (mantido só
   * pras vendas antigas que ainda estão em rascunho aguardando
   * aprovação manual).
   */
  private async applyApproval(
    tx: Prisma.TransactionClient,
    companyId: string,
    sale: Prisma.SaleGetPayload<{
      include: { items: { include: { product: true } } };
    }>,
    approveFields: ApproveSaleDto,
    userId: string,
  ) {
    const documentNumber = formatSaleNumber(sale.number);

    // Sem tipo informado, mas com chave de acesso: só pode ser
    // nota fiscal eletrônica.
    const documentType =
      approveFields.documentType ??
      (approveFields.invoiceKey
        ? FinancialDocumentType.NOTA_FISCAL
        : undefined);

    const exitObservation = [
      'Saída',
      documentType
        ? DOCUMENT_TYPE_LABELS[documentType]
        : undefined,
      approveFields.invoiceNumber,
    ]
      .filter(Boolean)
      .join(' ');

    for (const item of sale.items) {
      // Item de produto que não controla estoque (serviço/despesa)
      // não mexe em Inventory/StockMovement — só entra no valor
      // total da venda mesmo.
      if (
        item.product.inventoryControl ===
        InventoryControl.NONE
      ) {
        continue;
      }

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

    const invoiceIssueDate = approveFields.invoiceIssueDate
      ? new Date(approveFields.invoiceIssueDate)
      : undefined;

    // Se vier prazo/forma de pagamento aqui, eles valem mais que o
    // estimado no lançamento, e o vencimento é recalculado a partir
    // da data de emissão da nota (não da data da venda).
    const termDays = approveFields.termDays ?? sale.termDays ?? 0;
    const paymentMethod =
      approveFields.paymentMethod ?? sale.paymentMethod;
    const issueDate =
      invoiceIssueDate ?? sale.saleDate ?? new Date();

    // Parcelas: o que vier explícito vale mais; senão, usa o que já
    // foi planejado na venda (herdado do pedido de venda de origem,
    // ver SaleService.create); só na falta dos dois é que recalcula
    // sozinho a partir de termDays × installmentsCount — mesma
    // cascata de PurchaseService.receive().
    const effectiveInstallments: { dueDate: string; amount: number }[] =
      approveFields.installments?.length
        ? approveFields.installments
        : Array.isArray(sale.plannedInstallments) &&
            sale.plannedInstallments.length > 0
          ? (sale.plannedInstallments as unknown as {
              dueDate: string;
              amount: number;
            }[])
          : [];

    // Sem parcelas explícitas/planejadas nem quantidade informada,
    // usa a quantidade já registrada na venda (ex.: herdada do pedido
    // de venda de origem).
    const effectiveInstallmentsCount =
      approveFields.installmentsCount ?? sale.installmentsCount ?? 1;

    const autoInstallments =
      !effectiveInstallments.length &&
      effectiveInstallmentsCount > 1
        ? buildAutoInstallments(
            issueDate,
            termDays,
            effectiveInstallmentsCount,
            Number(sale.netAmount),
          )
        : null;

    // Parcelas explícitas/planejadas (ex.: importação de nota, ou
    // vindas do pedido de origem) têm prioridade sobre o prazo
    // único — cada uma já traz seu próprio vencimento, não recalcula
    // a partir de termDays.
    const dueDate = effectiveInstallments.length
      ? new Date(effectiveInstallments[0].dueDate)
      : autoInstallments
        ? autoInstallments[0].dueDate
        : calculateDueDate(issueDate, termDays);

    const updated = await tx.sale.update({
      where: {
        id: sale.id,
      },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        invoiceNumber: approveFields.invoiceNumber,
        invoiceKey: approveFields.invoiceKey,
        invoiceIssueDate,
        termDays,
        installmentsCount: effectiveInstallmentsCount,
        paymentMethod,
        dueDate,
        updatedById: userId,
      },
    });

    // Gera automaticamente a conta a receber desta venda, já com os
    // dados fiscais e financeiros disponíveis — não precisa entrar em
    // Contas a receber depois para completar vencimento/forma de
    // pagamento. Com parcelas explícitas, gera uma FinancialEntry por
    // parcela em vez de uma só.
    const commonEntryData = {
      companyId,
      type: FinancialEntryType.RECEIVABLE,
      partnerId: sale.partnerId,
      issueDate,
      termDays,
      paymentMethod,
      documentNumber: approveFields.invoiceNumber,
      documentKey: approveFields.invoiceKey,
      documentType,
      chartOfAccountId: sale.chartOfAccountId,
      saleId: sale.id,
      observation: `Venda ${sale.id}`,
    };

    if (effectiveInstallments.length) {
      await this.financialEntriesService.createInstallments(
        tx,
        {
          ...commonEntryData,
          installments: effectiveInstallments.map(
            (installment) => ({
              dueDate: new Date(installment.dueDate),
              amount: installment.amount,
            }),
          ),
        },
        userId,
      );
    } else if (autoInstallments) {
      await this.financialEntriesService.createInstallments(
        tx,
        {
          ...commonEntryData,
          installments: autoInstallments,
        },
        userId,
      );
    } else {
      await this.financialEntriesService.createFromDocument(
        tx,
        {
          ...commonEntryData,
          amount: Number(updated.netAmount),
          dueDate,
        },
        userId,
      );
    }

    return updated;
  }

  /**
   * Devolve o estoque baixado e cancela os títulos ainda abertos
   * gerados pra essa venda — reaproveitado tanto pelo cancelamento de
   * uma venda aprovada quanto pela edição de campos que afetam
   * estoque/título (que primeiro desfaz, depois chama `applyApproval`
   * de novo com os valores atualizados).
   */
  private async revertApproval(
    tx: Prisma.TransactionClient,
    companyId: string,
    sale: Prisma.SaleGetPayload<{
      include: { items: { include: { product: true } } };
    }>,
    userId: string,
  ) {
    for (const item of sale.items) {
      if (
        item.product.inventoryControl ===
        InventoryControl.NONE
      ) {
        continue;
      }

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
          observation: 'Estorno da venda',
          documentNumber: formatSaleNumber(sale.number),
        },
      });
    }

    // Título gerado não faz mais sentido se a venda foi cancelada ou
    // vai ser refeita com valores novos. Se já foi baixado (o cliente
    // já pagou), não deveria ter chegado até aqui — quem chama já
    // barrou isso antes.
    await tx.financialEntry.updateMany({
      where: {
        saleId: sale.id,
        status: 'OPEN',
      },
      data: {
        status: 'CANCELLED',
        updatedById: userId,
      },
    });
  }

  async approve(
    companyId: string,
    id: string,
    dto: ApproveSaleDto = {},
    userId: string,
  ) {
    const sale =
      await this.prisma.sale.findFirst({
        where: {
          id,
          companyId,
        },
        include: {
          items: {
            include: { product: true },
          },
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

    await this.assertNoOpenInventoryCount(
      sale.warehouseId,
      sale.items.map((item) => item.productId),
    );

    if (dto.invoiceNumber) {
      await this.assertInvoiceNumberNotDuplicated(
        companyId,
        sale.partnerId,
        dto.invoiceNumber,
        sale.id,
      );
    }

    const updatedSale = await this.prisma.$transaction((tx) =>
      this.applyApproval(tx, companyId, sale, dto, userId),
    );

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

  /**
   * Une o que antes eram dois passos (cancelar rascunho / desfazer
   * aprovação) numa ação só — Venda não passa mais por aprovação
   * separada, então "cancelar" já reverte estoque e título quando
   * aplicável (rascunho legado não tem nada pra reverter). Devolve
   * pro Pedido de origem o saldo que essa venda tinha consumido, pra
   * ele poder ser estornado/cancelado/excluído em seguida.
   */
  async cancel(
    companyId: string,
    id: string,
    userId: string,
  ) {
    const sale = await this.findOne(companyId, id);

    if (sale.status !== 'DRAFT' && sale.status !== 'APPROVED') {
      throw new BadRequestException(
        'Esta venda não pode ser cancelada.',
      );
    }

    const hasPaidEntry = sale.financialEntries.some(
      (entry) => entry.status === FinancialEntryStatus.PAID,
    );

    if (hasPaidEntry) {
      throw new BadRequestException(
        'Esta venda já tem recebimento registrado no financeiro. Estorne a baixa antes de cancelar.',
      );
    }

    if (sale.status === 'APPROVED') {
      await this.assertNoOpenInventoryCount(
        sale.warehouseId,
        sale.items.map((item) => item.productId),
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (sale.status === 'APPROVED') {
        await this.revertApproval(tx, companyId, sale, userId);
      }

      const cancelled = await tx.sale.update({
        where: { id },
        data: { status: 'CANCELLED', updatedById: userId },
      });

      // Nasceu de um Pedido de Venda — devolve pro pedido só o
      // saldo que ESTA venda tinha consumido (não zera o pedido
      // inteiro, já que ele pode ter outras vendas parciais
      // vinculadas), e recalcula o status a partir do saldo que
      // sobrou depois disso.
      if (sale.salesOrderId) {
        const orderItems = await tx.salesOrderItem.findMany({
          where: { salesOrderId: sale.salesOrderId },
        });

        for (const saleItem of sale.items) {
          const orderItem = orderItems.find(
            (item) => item.productId === saleItem.productId,
          );
          if (!orderItem) continue;

          await tx.salesOrderItem.update({
            where: { id: orderItem.id },
            data: {
              convertedQuantity: {
                decrement: Number(saleItem.quantity),
              },
            },
          });
        }

        const updatedItems = await tx.salesOrderItem.findMany({
          where: { salesOrderId: sale.salesOrderId },
        });

        const allConverted = updatedItems.every(
          (item) =>
            Number(item.quantity) -
              Number(item.convertedQuantity) -
              Number(item.discardedQuantity) <=
            0.0001,
        );
        const anyConverted = updatedItems.some(
          (item) =>
            Number(item.convertedQuantity) > 0.0001 ||
            Number(item.discardedQuantity) > 0.0001,
        );

        await tx.salesOrder.update({
          where: { id: sale.salesOrderId },
          data: {
            status: allConverted
              ? SalesOrderStatus.CONVERTED
              : anyConverted
                ? SalesOrderStatus.PARTIALLY_CONVERTED
                : SalesOrderStatus.DRAFT,
          },
        });
      }

      return cancelled;
    });
  }

  async remove(
    companyId: string,
    id: string,
  ) {
    const sale = await this.findOne(companyId, id);

    if (sale.status !== 'CANCELLED') {
      throw new BadRequestException(
        'Só vendas canceladas podem ser excluídas.',
      );
    }

    await this.prisma.sale.delete({
      where: { id },
    });
  }
}
