import { Injectable } from '@nestjs/common';
import {
  Inventory,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateInventoryDto } from '../dto/create-inventory.dto';
import { UpdateInventoryDto } from '../dto/update-inventory.dto';
import { InventoryFilterDto } from '../dto/inventory-filter.dto';

@Injectable()
export class InventoryRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    companyId: string,
    data: CreateInventoryDto,
  ): Promise<Inventory> {
    return this.prisma.inventory.create({
      data: {
        companyId,
        productId: data.productId,
        warehouseId: data.warehouseId,
        quantity: data.quantity,
        averageCost: data.averageCost,
        active: data.active ?? true,
      },
    });
  }

  async findById(
    companyId: string,
    id: string,
  ): Promise<Inventory | null> {
    return this.prisma.inventory.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        product: true,
        warehouse: true,
      },
    });
  }

  async findByProductAndWarehouse(
    companyId: string,
    productId: string,
    warehouseId: string,
  ): Promise<Inventory | null> {
    return this.prisma.inventory.findFirst({
      where: {
        companyId,
        productId,
        warehouseId,
      },
    });
  }

  async findAll(
    companyId: string,
    filter: InventoryFilterDto,
  ) {
    const {
      productId,
      warehouseId,
      page,
      limit,
      orderBy,
      order,
    } = filter;

    const where: Prisma.InventoryWhereInput = {
      companyId,

      ...(productId && {
        productId,
      }),

      ...(warehouseId && {
        warehouseId,
      }),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.inventory.findMany({
          where,
          include: {
            product: true,
            warehouse: true,
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: {
            [orderBy]: order,
          },
        }),

        this.prisma.inventory.count({
          where,
        }),
      ]);

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  // Observação: Prisma só aceita campos únicos em `where` de update().
  // A checagem de que `id` pertence a `companyId` é feita no service
  // (via findById) ANTES de chamar estes métodos.
  async update(
    id: string,
    data: UpdateInventoryDto,
  ): Promise<Inventory> {
    return this.prisma.inventory.update({
      where: {
        id,
      },
      data: {
        ...(data.quantity !== undefined && {
          quantity: data.quantity,
        }),

        ...(data.averageCost !== undefined && {
          averageCost: data.averageCost,
        }),

        ...(data.active !== undefined && {
          active: data.active,
        }),
      },
    });
  }

  async decreaseStock(
    tx: Prisma.TransactionClient,
    inventoryId: string,
    quantity: number,
  ): Promise<Inventory> {
    return tx.inventory.update({
      where: {
        id: inventoryId,
      },
      data: {
        quantity: {
          decrement: quantity,
        },
      },
    });
  }

  async increaseStock(
    tx: Prisma.TransactionClient,
    inventoryId: string,
    quantity: number,
  ): Promise<Inventory> {
    return tx.inventory.update({
      where: {
        id: inventoryId,
      },
      data: {
        quantity: {
          increment: quantity,
        },
      },
    });
  }

  async delete(
    id: string,
  ): Promise<Inventory> {
    return this.prisma.inventory.update({
      where: {
        id,
      },
      data: {
        active: false,
      },
    });
  }
}
