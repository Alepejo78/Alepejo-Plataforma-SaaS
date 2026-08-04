import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PurchaseStatus,
  StockMovementType,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { PurchaseRepository } from '../repositories/purchase.repository';

import { CreatePurchaseDto } from '../dto/create-purchase.dto';
import { PurchaseFilterDto } from '../dto/purchase-filter.dto';

@Injectable()
export class PurchaseService {
  constructor(
    private readonly repository: PurchaseRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    companyId: string,
    dto: CreatePurchaseDto,
  ) {
    const supplier =
      await this.prisma.supplier.findFirst({
        where: {
          id: dto.supplierId,
          companyId,
        },
      });

    if (!supplier) {
      throw new NotFoundException(
        'Fornecedor não encontrado.',
      );
    }

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

    return this.repository.create(
      companyId,
      dto,
      totalAmount,
    );
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
  ) {
    const purchase =
      await this.prisma.purchase.findFirst({
        where: {
          id,
          companyId,
        },
        include: {
          items: true,
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
        for (const item of purchase.items) {
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
                },
              });
          }

          await tx.inventory.update({
            where: {
              id: inventory.id,
            },
            data: {
              quantity: {
                increment:
                  Number(item.quantity),
              },
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
              observation: `Entrada automática da compra ${purchase.id}`,
            },
          });
        }

        await tx.purchase.update({
          where: {
            id: purchase.id,
          },
          data: {
            status:
              PurchaseStatus.RECEIVED,
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