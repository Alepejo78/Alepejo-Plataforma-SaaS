import { Injectable } from '@nestjs/common';
import { InventoryCount, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { InventoryCountFilterDto } from '../dto/inventory-count-filter.dto';

const includeRelations = {
  warehouse: true,
  items: {
    include: { product: true },
  },
} satisfies Prisma.InventoryCountInclude;

interface ItemInput {
  productId: string;
  systemQuantity: number;
}

@Injectable()
export class InventoryCountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tx: Prisma.TransactionClient,
    companyId: string,
    number: number,
    dto: {
      warehouseId: string;
      countDate?: Date;
      observation: string;
      items: ItemInput[];
    },
    userId: string,
  ): Promise<InventoryCount> {
    return tx.inventoryCount.create({
      data: {
        companyId,
        number,
        warehouseId: dto.warehouseId,
        countDate: dto.countDate,
        observation: dto.observation,
        createdById: userId,
        updatedById: userId,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            systemQuantity: item.systemQuantity,
          })),
        },
      },
      include: includeRelations,
    });
  }

  async findAll(
    companyId: string,
    filter: InventoryCountFilterDto,
  ) {
    const where: Prisma.InventoryCountWhereInput = {
      companyId,
      ...(filter.warehouseId && {
        warehouseId: filter.warehouseId,
      }),
      ...(filter.status && { status: filter.status }),
    };

    return this.prisma.inventoryCount.findMany({
      where,
      include: includeRelations,
      orderBy: { number: 'desc' },
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.inventoryCount.findFirst({
      where: { id, companyId },
      include: includeRelations,
    });
  }

  async update(
    id: string,
    dto: {
      warehouseId?: string;
      countDate?: Date;
      observation?: string;
      items?: ItemInput[];
    },
    userId: string,
  ): Promise<InventoryCount> {
    return this.prisma.inventoryCount.update({
      where: { id },
      data: {
        updatedById: userId,
        ...(dto.warehouseId && {
          warehouseId: dto.warehouseId,
        }),
        ...(dto.countDate !== undefined && {
          countDate: dto.countDate,
        }),
        ...(dto.observation !== undefined && {
          observation: dto.observation,
        }),
        ...(dto.items && {
          items: {
            deleteMany: {},
            create: dto.items.map((item) => ({
              productId: item.productId,
              systemQuantity: item.systemQuantity,
            })),
          },
        }),
      },
      include: includeRelations,
    });
  }

  async cancel(id: string, userId: string): Promise<InventoryCount> {
    return this.prisma.inventoryCount.update({
      where: { id },
      data: { status: 'CANCELLED', updatedById: userId },
    });
  }
}
