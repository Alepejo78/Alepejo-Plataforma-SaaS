import { Injectable } from '@nestjs/common';
import { PaymentMethod, Prisma, SalesOrder } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateSalesOrderDto } from '../dto/create-sales-order.dto';
import { SalesOrderFilterDto } from '../dto/sales-order-filter.dto';

const includeRelations = {
  partner: true,
  warehouse: true,
  chartOfAccount: {
    select: { id: true, code: true, description: true },
  },
  items: {
    include: {
      product: { include: { saleChartOfAccount: true } },
    },
  },
  sales: true,
};

@Injectable()
export class SalesOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tx: Prisma.TransactionClient,
    companyId: string,
    number: number,
    dto: CreateSalesOrderDto,
    totalAmount: number,
    netAmount: number,
    userId: string,
  ) {
    return tx.salesOrder.create({
      data: {
        companyId,
        number,
        partnerId: dto.partnerId,
        warehouseId: dto.warehouseId,
        orderDate: dto.orderDate
          ? new Date(dto.orderDate)
          : undefined,
        observation: dto.observation,
        discountValue: dto.discountValue ?? 0,
        freightValue: dto.freightValue ?? 0,
        otherExpenses: dto.otherExpenses ?? 0,
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
    filter: SalesOrderFilterDto,
  ) {
    const where: Prisma.SalesOrderWhereInput = {
      companyId,
      ...(filter.partnerId && { partnerId: filter.partnerId }),
      ...(filter.warehouseId && {
        warehouseId: filter.warehouseId,
      }),
      ...(filter.status && { status: filter.status }),
    };

    return this.prisma.salesOrder.findMany({
      where,
      include: includeRelations,
      orderBy: { number: 'desc' },
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.salesOrder.findFirst({
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
      discountValue?: number;
      freightValue?: number;
      otherExpenses?: number;
      totalAmount?: number;
      netAmount?: number;
      chartOfAccountId?: string;
      termDays?: number;
      paymentMethod?: PaymentMethod;
      installmentsCount?: number;
      plannedInstallments?: { dueDate: string; amount: number }[] | null;
      items?: {
        productId: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }[];
    },
    userId: string,
  ): Promise<SalesOrder> {
    return this.prisma.salesOrder.update({
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
        ...(dto.discountValue !== undefined && {
          discountValue: dto.discountValue,
        }),
        ...(dto.freightValue !== undefined && {
          freightValue: dto.freightValue,
        }),
        ...(dto.otherExpenses !== undefined && {
          otherExpenses: dto.otherExpenses,
        }),
        ...(dto.totalAmount !== undefined && {
          totalAmount: dto.totalAmount,
        }),
        ...(dto.netAmount !== undefined && {
          netAmount: dto.netAmount,
        }),
        ...(dto.chartOfAccountId !== undefined && {
          chartOfAccountId: dto.chartOfAccountId,
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
        ...(dto.plannedInstallments !== undefined && {
          plannedInstallments:
            dto.plannedInstallments === null
              ? Prisma.JsonNull
              : dto.plannedInstallments,
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

  async cancel(id: string, userId: string): Promise<SalesOrder> {
    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: 'CANCELLED', updatedById: userId },
    });
  }
}
