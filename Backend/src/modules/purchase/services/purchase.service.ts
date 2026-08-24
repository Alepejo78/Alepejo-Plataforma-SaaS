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
  PurchaseOrderStatus,
  PurchaseStatus,
  StockMovementType,
} from '@prisma/client';

import { BusinessPartnerRole } from '@prisma/client';

import { BusinessPartnersService } from '../../business-partners/services/business-partners.service';
import { FinancialEntriesService } from '../../financial-entries/services/financial-entries.service';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { calculateDueDate } from '../../../core/utils/business-day.util';
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

  async create(
    companyId: string,
    dto: CreatePurchaseDto,
  ) {
    // Valida que o parceiro existe, pertence à empresa e possui o
    // papel de FORNECEDOR.
    await this.businessPartnersService.assertHasRole(
      companyId,
      dto.partnerId,
      BusinessPartnerRole.SUPPLIER,
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

    if (dto.purchaseOrderId) {
      const order = await this.prisma.purchaseOrder.findFirst(
        {
          where: { id: dto.purchaseOrderId, companyId },
        },
      );

      if (!order) {
        throw new NotFoundException(
          'Pedido de compra não encontrado.',
        );
      }

      if (order.status !== PurchaseOrderStatus.DRAFT) {
        throw new BadRequestException(
          'Este pedido de compra já foi convertido em compra ou está cancelado.',
        );
      }
    }

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
        dto,
        totalAmount,
      );

      if (dto.purchaseOrderId) {
        await tx.purchaseOrder.update({
          where: { id: dto.purchaseOrderId },
          data: { status: PurchaseOrderStatus.CONVERTED },
        });
      }

      return purchase;
    });
  }

  async findAll(
    companyId: string,
    filter: PurchaseFilterDto,
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

    return purchase;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdatePurchaseDto,
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
        companyId,
        dto.partnerId,
        BusinessPartnerRole.SUPPLIER,
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

    let totalAmount = Number(purchase.totalAmount);

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

    return this.repository.update(id, {
      partnerId: dto.partnerId,
      warehouseId: dto.warehouseId,
      purchaseDate,
      observation: dto.observation,
      termDays,
      dueDate,
      paymentMethod: dto.paymentMethod,
      totalAmount,
      items,
    });
  }

  async approve(
    companyId: string,
    id: string,
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
      },
    });
  }

  async receive(
    companyId: string,
    id: string,
    dto: ReceivePurchaseDto = {},
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
        const dueDate = calculateDueDate(
          issueDate,
          termDays,
        );

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
            paymentMethod,
            dueDate,
          },
        });

        // Gera automaticamente a conta a pagar desta compra, já
        // com os dados fiscais e financeiros informados no
        // recebimento — não precisa entrar em Contas a pagar depois
        // para completar vencimento/forma de pagamento.
        await this.financialEntriesService.createFromDocument(
          tx,
          {
            companyId,
            type: FinancialEntryType.PAYABLE,
            partnerId: purchase.partnerId,
            amount: Number(purchase.totalAmount),
            issueDate,
            termDays,
            dueDate,
            paymentMethod,
            documentNumber: dto.invoiceNumber,
            documentKey: dto.invoiceKey,
            documentType,
            chartOfAccountId: purchase.chartOfAccountId,
            purchaseId: purchase.id,
            observation: `Compra ${purchase.id}`,
          },
        );
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
      },
    });
  }
}