import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  FinancialDocumentType,
  FinancialEntryStatus,
  FinancialEntryType,
  InventoryControl,
  PaymentMethod,
  PurchaseOrderStatus,
  PurchaseStatus,
  StockMovementType,
} from '@prisma/client';

import { BusinessPartnerRole } from '@prisma/client';

import { BusinessPartnersService } from '../../business-partners/services/business-partners.service';
import { FinancialEntriesService } from '../../financial-entries/services/financial-entries.service';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { calculateDueDate } from '../../../core/utils/business-day.util';
import { buildAutoInstallments } from '../../../core/utils/installment.util';
import { attachAuditNames, attachAuditName } from '../../../core/utils/audit-names.util';
import { DocumentSequenceService } from '../../../core/document-sequence/document-sequence.service';

import { PurchaseRepository } from '../repositories/purchase.repository';

import { CreatePurchaseDto } from '../dto/create-purchase.dto';
import { UpdatePurchaseDto } from '../dto/update-purchase.dto';
import { PurchaseFilterDto } from '../dto/purchase-filter.dto';
import { ReceivePurchaseDto } from '../dto/receive-purchase.dto';

const SEQUENCE_TYPE = 'PURCHASE';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  BOLETO: 'Boleto',
  CARNE: 'Carnê',
  CUPOM_FISCAL: 'Cupom Fiscal',
  NOTA_FISCAL: 'Nota fiscal',
  RECIBO: 'Recibo',
  OUTRO: 'Outro',
};

function formatPurchaseNumber(n: number) {
  return `C${String(n).padStart(9, '0')}`;
}

@Injectable()
export class PurchaseService {
  constructor(
    private readonly repository: PurchaseRepository,
    private readonly prisma: PrismaService,
    private readonly businessPartnersService: BusinessPartnersService,
    private readonly financialEntriesService: FinancialEntriesService,
    private readonly documentSequence: DocumentSequenceService,
  ) {}

  /**
   * Nota fiscal de um mesmo fornecedor não pode entrar duas vezes —
   * evita duplicidade (ex.: importar o mesmo XML duas vezes por
   * engano). Números iguais de fornecedores DIFERENTES são normais
   * (cada um numera do jeito dele), por isso o cheque é sempre por
   * fornecedor, nunca isolado. Compra cancelada não conta — se a
   * primeira tentativa foi cancelada, pode lançar de novo.
   */
  private async assertInvoiceNumberNotDuplicated(
    companyId: string,
    partnerId: string,
    invoiceNumber: string,
    excludeId?: string,
  ) {
    const duplicate = await this.prisma.purchase.findFirst({
      where: {
        companyId,
        partnerId,
        invoiceNumber,
        status: { not: PurchaseStatus.CANCELLED },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    if (duplicate) {
      throw new BadRequestException(
        `Já existe uma compra com a nota fiscal ${invoiceNumber} lançada para este fornecedor.`,
      );
    }
  }

  /**
   * Enquanto um produto está numa Contagem de Inventário em aberto
   * (rascunho) neste depósito, recebimento/estorno de compra desse
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
        inventoryCount: { warehouseId, status: 'DRAFT' },
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
    dto: CreatePurchaseDto,
    userId: string,
  ) {
    // Valida que o parceiro existe, pertence à empresa e possui o
    // papel de FORNECEDOR — cadastro de grupo (Interprise), checa pela
    // raiz do grupo, não pela empresa ativa.
    await this.businessPartnersService.assertHasRole(
      rootCompanyId,
      dto.partnerId,
      BusinessPartnerRole.SUPPLIER,
    );

    if (dto.invoiceNumber) {
      await this.assertInvoiceNumberNotDuplicated(
        companyId,
        dto.partnerId,
        dto.invoiceNumber,
      );
    }

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

    let sourceOrder: {
      chartOfAccountId: string | null;
      termDays: number | null;
      paymentMethod: PaymentMethod | null;
      installmentsCount: number | null;
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

    if (dto.purchaseOrderId) {
      const order = await this.prisma.purchaseOrder.findFirst({
        where: { id: dto.purchaseOrderId, companyId },
        include: { items: true },
      });

      if (!order) {
        throw new NotFoundException(
          'Pedido de compra não encontrado.',
        );
      }

      if (
        order.status !== PurchaseOrderStatus.DRAFT &&
        order.status !== PurchaseOrderStatus.PARTIALLY_CONVERTED
      ) {
        throw new BadRequestException(
          'Este pedido de compra já foi totalmente convertido em compra ou está cancelado.',
        );
      }

      // Confere que a quantidade lançada agora não estoura o saldo
      // disponível (pedida - já convertida) de cada produto do
      // pedido. Item da compra que não bate com nenhum item do
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
            `Saldo insuficiente no pedido de compra: ${product?.description ?? 'produto'} tem ${saldo} disponível, você está lançando ${requested}.`,
          );
        }
      }

      sourceOrder = order;
    }

    // Prazo/forma de pagamento/parcelas/tipo de despesa: se a tela
    // mandou um valor, vale; senão, herda do pedido de compra de
    // origem (que por sua vez já pode ter herdado da proposta
    // vencedora de uma cotação).
    const effectiveDto: CreatePurchaseDto = {
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
    };

    return this.prisma.$transaction(async (tx) => {
      const number = await this.documentSequence.next(
        tx,
        companyId,
        SEQUENCE_TYPE,
      );

      const purchase = await this.repository.create(
        tx,
        companyId,
        number,
        effectiveDto,
        totalAmount,
        userId,
      );

      if (dto.purchaseOrderId && sourceOrder) {
        for (const [productId, requested] of requestedByProduct) {
          const orderItem = sourceOrder.items.find(
            (item) => item.productId === productId,
          );
          if (!orderItem) continue;

          await tx.purchaseOrderItem.update({
            where: { id: orderItem.id },
            data: { convertedQuantity: { increment: requested } },
          });
        }

        const updatedItems = await tx.purchaseOrderItem.findMany({
          where: { purchaseOrderId: dto.purchaseOrderId },
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

        await tx.purchaseOrder.update({
          where: { id: dto.purchaseOrderId },
          data: {
            status: allConverted
              ? PurchaseOrderStatus.CONVERTED
              : anyConverted
                ? PurchaseOrderStatus.PARTIALLY_CONVERTED
                : PurchaseOrderStatus.DRAFT,
          },
        });
      }

      return purchase;
    });
  }

  async findAll(
    companyId: string,
    filter: PurchaseFilterDto,
  ) {
    const purchases = await this.repository.findAll(
      companyId,
      filter,
    );

    return attachAuditNames(this.prisma, purchases);
  }

  async findOne(
    companyId: string,
    id: string,
  ) {
    const purchase =
      await this.repository.findById(
        companyId,
        id,
      );

    if (!purchase) {
      throw new NotFoundException(
        'Compra não encontrada.',
      );
    }

    return attachAuditName(this.prisma, purchase);
  }

  async update(
    companyId: string,
    rootCompanyId: string,
    id: string,
    dto: UpdatePurchaseDto,
    userId: string,
  ) {
    const purchase = await this.findOne(companyId, id);

    // approve() não mexe em estoque nem financeiro — só o
    // recebimento faz isso. Por isso uma compra aprovada (ainda não
    // recebida) pode ser editada sem risco nenhum, igual à em
    // rascunho; só trava a partir de recebida (ou cancelada).
    if (
      purchase.status === PurchaseStatus.RECEIVED ||
      purchase.status === PurchaseStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Compra recebida ou cancelada não pode ser alterada.',
      );
    }

    if (dto.partnerId) {
      await this.businessPartnersService.assertHasRole(
        rootCompanyId,
        dto.partnerId,
        BusinessPartnerRole.SUPPLIER,
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

    if (dto.invoiceNumber) {
      await this.assertInvoiceNumberNotDuplicated(
        companyId,
        dto.partnerId ?? purchase.partnerId,
        dto.invoiceNumber,
        id,
      );
    }

    // Compra vinculada a um pedido consome saldo dele na criação — se
    // deixasse editar os itens depois, o saldo do pedido ficaria
    // inconsistente. Cancele e lance de novo se precisar corrigir.
    if (dto.items && purchase.purchaseOrderId) {
      throw new BadRequestException(
        'Esta compra está vinculada a um pedido de compra — os itens não podem ser alterados. Cancele e lance de novo se precisar corrigir produto/quantidade.',
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

    let totalAmount = Number(purchase.totalAmount);

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

    const purchaseDate = dto.purchaseDate
      ? new Date(dto.purchaseDate)
      : undefined;
    const termDays = dto.termDays;

    const dueDate =
      purchaseDate !== undefined || termDays !== undefined
        ? calculateDueDate(
            purchaseDate ??
              purchase.purchaseDate ??
              new Date(),
            termDays ?? purchase.termDays ?? 0,
          )
        : undefined;

    return this.repository.update(
      id,
      {
        partnerId: dto.partnerId,
        warehouseId: dto.warehouseId,
        purchaseDate,
        observation: dto.observation,
        termDays,
        dueDate,
        paymentMethod: dto.paymentMethod,
        totalAmount,
        invoiceNumber: dto.invoiceNumber,
        invoiceKey: dto.invoiceKey,
        invoiceIssueDate: dto.invoiceIssueDate
          ? new Date(dto.invoiceIssueDate)
          : undefined,
        items,
      },
      userId,
    );
  }

  async approve(
    companyId: string,
    id: string,
    userId: string,
  ) {
    const purchase =
      await this.findOne(companyId, id);

    if (
      purchase.status !== PurchaseStatus.DRAFT
    ) {
      throw new BadRequestException(
        'Somente compras em rascunho podem ser aprovadas.',
      );
    }

    return this.prisma.purchase.update({
      where: {
        id,
      },
      data: {
        status: PurchaseStatus.APPROVED,
        updatedById: userId,
      },
    });
  }

  async receive(
    companyId: string,
    id: string,
    dto: ReceivePurchaseDto = {},
    userId: string,
  ) {
    const purchase =
      await this.prisma.purchase.findFirst({
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

    if (!purchase) {
      throw new NotFoundException(
        'Compra não encontrada.',
      );
    }

    if (
      purchase.status !==
      PurchaseStatus.APPROVED
    ) {
      throw new BadRequestException(
        'A compra precisa estar aprovada.',
      );
    }

    await this.assertNoOpenInventoryCount(
      purchase.warehouseId,
      purchase.items.map((item) => item.productId),
    );

    if (dto.invoiceNumber) {
      await this.assertInvoiceNumberNotDuplicated(
        companyId,
        purchase.partnerId,
        dto.invoiceNumber,
        purchase.id,
      );
    }

    await this.prisma.$transaction(
      async (tx) => {
        const documentNumber = formatPurchaseNumber(
          purchase.number,
        );

        // Sem tipo informado, mas com chave de acesso: só pode ser
        // nota fiscal eletrônica.
        const documentType =
          dto.documentType ??
          (dto.invoiceKey
            ? FinancialDocumentType.NOTA_FISCAL
            : undefined);

        const entryObservation = [
          'Entrada',
          documentType
            ? DOCUMENT_TYPE_LABELS[documentType]
            : undefined,
          dto.invoiceNumber,
        ]
          .filter(Boolean)
          .join(' ');

        for (const item of purchase.items) {
          // Item de produto que não controla estoque (serviço/despesa,
          // ex.: nota importada direto sem pedido) não mexe em
          // Inventory/StockMovement — só entra no valor total mesmo.
          if (
            item.product.inventoryControl ===
            InventoryControl.NONE
          ) {
            continue;
          }

          let inventory =
            await tx.inventory.findFirst({
              where: {
                companyId,
                warehouseId:
                  purchase.warehouseId,
                productId:
                  item.productId,
              },
            });

          if (!inventory) {
            inventory =
              await tx.inventory.create({
                data: {
                  companyId,
                  warehouseId:
                    purchase.warehouseId,
                  productId:
                    item.productId,
                  quantity: 0,
                  averageCost: 0,
                },
              });
          }

          // Custo médio ponderado: mistura o saldo existente com o
          // que está entrando nesta compra.
          const existingQuantity = Number(
            inventory.quantity,
          );
          const existingAverageCost = Number(
            inventory.averageCost,
          );
          const receivedQuantity = Number(
            item.quantity,
          );
          const receivedCost = Number(
            item.unitPrice,
          );
          const totalQuantity =
            existingQuantity + receivedQuantity;

          const newAverageCost =
            totalQuantity > 0
              ? (existingQuantity *
                  existingAverageCost +
                  receivedQuantity *
                    receivedCost) /
                totalQuantity
              : existingAverageCost;

          await tx.inventory.update({
            where: {
              id: inventory.id,
            },
            data: {
              quantity: {
                increment: receivedQuantity,
              },
              averageCost: newAverageCost,
            },
          });

          await tx.stockMovement.create({
            data: {
              companyId,
              inventoryId:
                inventory.id,
              type:
                StockMovementType.ENTRY,
              quantity:
                Number(item.quantity),
              unitCost:
                Number(item.unitPrice),
              observation: entryObservation,
              documentNumber,
            },
          });
        }

        const invoiceIssueDate =
          dto.invoiceIssueDate
            ? new Date(dto.invoiceIssueDate)
            : undefined;

        // Recebimento é quando a nota fiscal de verdade chega —
        // se vier prazo/forma de pagamento aqui, eles valem mais
        // que o estimado no lançamento da compra, e o vencimento é
        // recalculado a partir da data de emissão da nota (não da
        // data de lançamento).
        const termDays =
          dto.termDays ?? purchase.termDays ?? 0;
        const paymentMethod =
          dto.paymentMethod ?? purchase.paymentMethod;
        const issueDate =
          invoiceIssueDate ??
          purchase.purchaseDate ??
          new Date();
        // Sem parcelas explícitas (ex.: importação de nota), mas com
        // mais de uma parcela pedida (na própria compra, ou herdada
        // do pedido/cotação de origem) — gera a divisão sozinho
        // (30/60/90... a partir do prazo).
        const effectiveInstallmentsCount =
          dto.installmentsCount ??
          purchase.installmentsCount ??
          1;

        const autoInstallments =
          !dto.installments?.length &&
          effectiveInstallmentsCount > 1
            ? buildAutoInstallments(
                issueDate,
                termDays,
                effectiveInstallmentsCount,
                Number(purchase.totalAmount),
              )
            : null;

        // Parcelas (explícitas ou geradas) têm prioridade sobre o
        // prazo único — cada uma já traz seu próprio vencimento, não
        // recalcula a partir de termDays.
        const dueDate = dto.installments?.length
          ? new Date(dto.installments[0].dueDate)
          : autoInstallments
            ? autoInstallments[0].dueDate
            : calculateDueDate(issueDate, termDays);

        await tx.purchase.update({
          where: {
            id: purchase.id,
          },
          data: {
            status:
              PurchaseStatus.RECEIVED,
            invoiceNumber: dto.invoiceNumber,
            invoiceKey: dto.invoiceKey,
            invoiceIssueDate,
            termDays,
            installmentsCount: effectiveInstallmentsCount,
            paymentMethod,
            dueDate,
            updatedById: userId,
          },
        });

        // Gera automaticamente a conta a pagar desta compra, já
        // com os dados fiscais e financeiros informados no
        // recebimento — não precisa entrar em Contas a pagar depois
        // para completar vencimento/forma de pagamento. Com parcelas
        // explícitas, gera uma FinancialEntry por parcela em vez de
        // uma só.
        const commonEntryData = {
          companyId,
          type: FinancialEntryType.PAYABLE,
          partnerId: purchase.partnerId,
          issueDate,
          termDays,
          paymentMethod,
          documentNumber: dto.invoiceNumber,
          documentKey: dto.invoiceKey,
          documentType,
          chartOfAccountId: purchase.chartOfAccountId,
          purchaseId: purchase.id,
          observation: `Compra ${purchase.id}`,
        };

        if (dto.installments?.length) {
          await this.financialEntriesService.createInstallments(
            tx,
            {
              ...commonEntryData,
              installments: dto.installments.map(
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
              amount: Number(purchase.totalAmount),
              dueDate,
            },
            userId,
          );
        }
      },
    );

    return this.findOne(
      companyId,
      id,
    );
  }

  async unreceive(
    companyId: string,
    id: string,
    userId: string,
  ) {
    const purchase =
      await this.prisma.purchase.findFirst({
        where: {
          id,
          companyId,
        },
        include: {
          items: {
            include: { product: true },
          },
          financialEntries: true,
        },
      });

    if (!purchase) {
      throw new NotFoundException(
        'Compra não encontrada.',
      );
    }

    if (
      purchase.status !==
      PurchaseStatus.RECEIVED
    ) {
      throw new BadRequestException(
        'Somente compras recebidas podem ter o recebimento estornado.',
      );
    }

    const jaPago = purchase.financialEntries.some(
      (entry) =>
        entry.status === FinancialEntryStatus.PAID,
    );

    if (jaPago) {
      throw new BadRequestException(
        'Esta compra já tem pagamento registrado no financeiro. Estorne a baixa antes de estornar o recebimento.',
      );
    }

    await this.assertNoOpenInventoryCount(
      purchase.warehouseId,
      purchase.items.map((item) => item.productId),
    );

    await this.prisma.$transaction(
      async (tx) => {
        for (const item of purchase.items) {
          // Item de serviço/despesa não mexeu em estoque no
          // recebimento (ver receive()) — não tem o que estornar.
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
                warehouseId:
                  purchase.warehouseId,
                productId:
                  item.productId,
              },
            });

          const saldo = Number(
            inventory?.quantity ?? 0,
          );
          const quantidade = Number(
            item.quantity,
          );

          if (!inventory || saldo < quantidade) {
            throw new BadRequestException(
              `Estoque insuficiente para estornar o recebimento do produto ${item.productId} — parte do saldo já foi movimentada.`,
            );
          }

          await tx.inventory.update({
            where: {
              id: inventory.id,
            },
            data: {
              quantity: saldo - quantidade,
            },
          });

          await tx.stockMovement.create({
            data: {
              companyId,
              inventoryId:
                inventory.id,
              type:
                StockMovementType.EXIT,
              quantity: quantidade,
              unitCost:
                Number(item.unitPrice),
              observation: 'Estorno do recebimento da compra',
              documentNumber: formatPurchaseNumber(
                purchase.number,
              ),
            },
          });
        }

        await tx.purchase.update({
          where: {
            id: purchase.id,
          },
          data: {
            status:
              PurchaseStatus.APPROVED,
            updatedById: userId,
          },
        });

        await tx.financialEntry.updateMany({
          where: {
            purchaseId: purchase.id,
            status: FinancialEntryStatus.OPEN,
          },
          data: {
            status: FinancialEntryStatus.CANCELLED,
          },
        });
      },
    );

    return this.findOne(
      companyId,
      id,
    );
  }

  async cancel(
    companyId: string,
    id: string,
    userId: string,
  ) {
    const purchase =
      await this.findOne(companyId, id);

    if (
      purchase.status ===
      PurchaseStatus.RECEIVED
    ) {
      throw new BadRequestException(
        'Compras recebidas não podem ser canceladas.',
      );
    }

    return this.prisma.purchase.update({
      where: {
        id,
      },
      data: {
        status:
          PurchaseStatus.CANCELLED,
        updatedById: userId,
      },
    });
  }

  async remove(
    companyId: string,
    id: string,
  ) {
    const purchase =
      await this.findOne(companyId, id);

    if (
      purchase.status !==
      PurchaseStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Só compras canceladas podem ser excluídas.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.purchase.delete({
        where: { id },
      });

      // Nasceu de um Pedido de Compra — devolve pro pedido só o
      // saldo que ESTA compra tinha consumido (não zera o pedido
      // inteiro, já que ele pode ter outras compras parciais
      // vinculadas), e recalcula o status a partir do saldo que
      // sobrou depois disso.
      if (purchase.purchaseOrderId) {
        const orderItems = await tx.purchaseOrderItem.findMany({
          where: { purchaseOrderId: purchase.purchaseOrderId },
        });

        for (const purchaseItem of purchase.items) {
          const orderItem = orderItems.find(
            (item) => item.productId === purchaseItem.productId,
          );
          if (!orderItem) continue;

          await tx.purchaseOrderItem.update({
            where: { id: orderItem.id },
            data: {
              convertedQuantity: {
                decrement: Number(purchaseItem.quantity),
              },
            },
          });
        }

        const updatedItems = await tx.purchaseOrderItem.findMany({
          where: { purchaseOrderId: purchase.purchaseOrderId },
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

        await tx.purchaseOrder.update({
          where: { id: purchase.purchaseOrderId },
          data: {
            status: allConverted
              ? PurchaseOrderStatus.CONVERTED
              : anyConverted
                ? PurchaseOrderStatus.PARTIALLY_CONVERTED
                : PurchaseOrderStatus.DRAFT,
          },
        });
      }
    });
  }
}