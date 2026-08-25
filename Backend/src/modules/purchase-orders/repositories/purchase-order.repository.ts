import { Injectable } from '@nestjs/common';
import { PaymentMethod, Prisma, PurchaseOrder } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { PurchaseOrderFilterDto } from '../dto/purchase-order-filter.dto';

const includeRelations = {
  partner: true,
  warehouse: true,
  items: {
    include: { product: true },
  },
  purchase: true,
};

@Injectable()
export class PurchaseOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tx: Prisma.TransactionClient,
    companyId: string,
    number: number,
    dto: CreatePurchaseOrderDto,
    totalAmount: number,
    userId: string,
  ) {
    return tx.purchaseOrder.create({
      data: {
        companyId,
        number,
        partnerId: dto.partnerId,
        warehouseId: dto.warehouseId,
        orderDate: dto.orderDate
          ? new Date(dto.orderDate)
          : undefined,
        observation: dto.observation,
        totalAmount,
        quotationId: dto.quotationId,
        quotationOfferId: dto.quotationOfferId,
        termDays: dto.termDays,
        paymentMethod: dto.paymentMethod,
        installmentsCount: dto.installmentsCount,
        createdById: userId,
        updatedById: userId,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
      },
      include: includeRelations,
    });
  }

  async findAll(
    companyId: string,
    filter: PurchaseOrderFilterDto,
  ) {
    const where: Prisma.PurchaseOrderWhereInput = {
      companyId,
      ...(filter.partnerId && { partnerId: filter.partnerId }),
      ...(filter.warehouseId && {
        warehouseId: filter.warehouseId,
      }),
      ...(filter.status && { status: filter.status }),
    };

    return this.prisma.purchaseOrder.findMany({
      where,
      include: includeRelations,
      orderBy: { number: 'desc' },
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.purchaseOrder.findFirst({
      where: { id, companyId },
      include: includeRelations,
    });
  }

  async update(
    id: string,
    dto: {
      partnerId?: string;
      warehouseId?: string;
      orderDate?: Date;
      observation?: string;
      totalAmount?: number;
      termDays?: number;
      paymentMethod?: PaymentMethod;
      installmentsCount?: number;
      items?: {
        productId: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }[];
    },
    userId: string,
  ): Promise<PurchaseOrder> {
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        updatedById: userId,
        ...(dto.partnerId && { partnerId: dto.partnerId }),
        ...(dto.warehouseId && {
          warehouseId: dto.warehouseId,
        }),
        ...(dto.orderDate !== undefined && {
          orderDate: dto.orderDate,
        }),
        ...(dto.observation !== undefined && {
          observation: dto.observation,
        }),
        ...(dto.totalAmount !== undefined && {
          totalAmount: dto.totalAmount,
        }),
        ...(dto.termDays !== undefined && {
          termDays: dto.termDays,
        }),
        ...(dto.paymentMethod !== undefined && {
          paymentMethod: dto.paymentMethod,
        }),
        ...(dto.installmentsCount !== undefined && {
          installmentsCount: dto.installmentsCount,
        }),
        ...(dto.items && {
          items: {
            deleteMany: {},
            create: dto.items,
          },
        }),
      },
      include: includeRelations,
    });
  }

  async cancel(id: string, userId: string): Promise<PurchaseOrder> {
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED', updatedById: userId },
    });
  }
}
