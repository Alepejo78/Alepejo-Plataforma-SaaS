import { Injectable } from '@nestjs/common';
import { Prisma, ProductionOrderStatus } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateProductionOrderDto } from '../dto/create-production-order.dto';
import { ProductionOrderFilterDto } from '../dto/production-order-filter.dto';

const includeRelations = {
  product: true,
  warehouse: true,
  salesOrder: {
    select: { id: true, number: true },
  },
};

@Injectable()
export class ProductionOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tx: Prisma.TransactionClient,
    companyId: string,
    number: number,
    data: {
      productId: string;
      warehouseId: string;
      quantity: number;
      expectedDate?: Date;
      observation?: string;
      origin?: 'MANUAL' | 'SALES_ORDER' | 'LOW_STOCK';
      salesOrderId?: string;
    },
  ) {
    return tx.productionOrder.create({
      data: {
        companyId,
        number,
        productId: data.productId,
        warehouseId: data.warehouseId,
        quantity: data.quantity,
        expectedDate: data.expectedDate,
        observation: data.observation,
        origin: data.origin ?? 'MANUAL',
        salesOrderId: data.salesOrderId,
      },
      include: includeRelations,
    });
  }

  async findAll(
    companyId: string,
    filter: ProductionOrderFilterDto,
  ) {
    const where: Prisma.ProductionOrderWhereInput = {
      companyId,
      ...(filter.productId && { productId: filter.productId }),
      ...(filter.warehouseId && {
        warehouseId: filter.warehouseId,
      }),
      ...(filter.status && { status: filter.status }),
      ...(filter.origin && { origin: filter.origin }),
    };

    return this.prisma.productionOrder.findMany({
      where,
      include: includeRelations,
      orderBy: { number: 'desc' },
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.productionOrder.findFirst({
      where: { id, companyId },
      include: includeRelations,
    });
  }

  /** Ordens ainda abertas (rascunho) pra um produto — usado pra não duplicar geração automática. */
  async findOpenByProduct(companyId: string, productId: string) {
    return this.prisma.productionOrder.findFirst({
      where: {
        companyId,
        productId,
        status: ProductionOrderStatus.DRAFT,
      },
    });
  }

  async update(
    id: string,
    dto: {
      productId?: string;
      warehouseId?: string;
      quantity?: number;
      expectedDate?: Date;
      observation?: string;
    },
  ) {
    return this.prisma.productionOrder.update({
      where: { id },
      data: {
        ...(dto.productId && { productId: dto.productId }),
        ...(dto.warehouseId && {
          warehouseId: dto.warehouseId,
        }),
        ...(dto.quantity !== undefined && {
          quantity: dto.quantity,
        }),
        ...(dto.expectedDate !== undefined && {
          expectedDate: dto.expectedDate,
        }),
        ...(dto.observation !== undefined && {
          observation: dto.observation,
        }),
      },
      include: includeRelations,
    });
  }

  async cancel(id: string) {
    return this.prisma.productionOrder.update({
      where: { id },
      data: { status: ProductionOrderStatus.CANCELLED },
    });
  }

  async complete(
    id: string,
    completedAt: Date,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).productionOrder.update({
      where: { id },
      data: {
        status: ProductionOrderStatus.COMPLETED,
        completedAt,
      },
      include: includeRelations,
    });
  }

  async undoComplete(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).productionOrder.update({
      where: { id },
      data: {
        status: ProductionOrderStatus.DRAFT,
        completedAt: null,
      },
      include: includeRelations,
    });
  }
}
