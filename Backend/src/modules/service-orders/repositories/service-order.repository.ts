import { Injectable } from '@nestjs/common';
import {
  PaymentMethod,
  Prisma,
  ServiceOrder,
  ServiceOrderStatus,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateServiceOrderDto } from '../dto/create-service-order.dto';
import { ServiceOrderFilterDto } from '../dto/service-order-filter.dto';

const includeRelations = {
  partner: true,
  warehouse: true,
  chartOfAccount: {
    select: { id: true, code: true, description: true },
  },
  serviceItems: { include: { product: true } },
  productItems: { include: { product: true } },
  salesOrder: { select: { id: true, number: true, status: true } },
};

@Injectable()
export class ServiceOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tx: Prisma.TransactionClient,
    companyId: string,
    number: number,
    dto: CreateServiceOrderDto,
    totalAmount: number,
    netAmount: number,
    userId: string,
  ) {
    return tx.serviceOrder.create({
      data: {
        companyId,
        number,
        partnerId: dto.partnerId,
        warehouseId: dto.warehouseId,
        description: dto.description,
        scheduledStart: dto.scheduledStart
          ? new Date(dto.scheduledStart)
          : undefined,
        scheduledEnd: dto.scheduledEnd
          ? new Date(dto.scheduledEnd)
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
        quoteId: dto.quoteId,
        createdById: userId,
        updatedById: userId,
        serviceItems: {
          create: dto.serviceItems.map((item) => ({
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
        productItems: {
          create: dto.productItems.map((item) => ({
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

  async findAll(companyId: string, filter: ServiceOrderFilterDto) {
    const where: Prisma.ServiceOrderWhereInput = {
      companyId,
      ...(filter.partnerId && { partnerId: filter.partnerId }),
      ...(filter.warehouseId && { warehouseId: filter.warehouseId }),
      ...(filter.status && { status: filter.status }),
    };

    return this.prisma.serviceOrder.findMany({
      where,
      include: includeRelations,
      orderBy: { number: 'desc' },
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.serviceOrder.findFirst({
      where: { id, companyId },
      include: includeRelations,
    });
  }

  async update(
    id: string,
    dto: {
      partnerId?: string;
      warehouseId?: string;
      description?: string;
      scheduledStart?: Date;
      scheduledEnd?: Date;
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
      serviceItems?: {
        productId: string;
        description?: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }[];
      productItems?: {
        productId: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }[];
    },
    userId: string,
  ): Promise<ServiceOrder> {
    return this.prisma.serviceOrder.update({
      where: { id },
      data: {
        updatedById: userId,
        ...(dto.partnerId && { partnerId: dto.partnerId }),
        ...(dto.warehouseId && { warehouseId: dto.warehouseId }),
        ...(dto.description !== undefined && {
          description: dto.description,
        }),
        ...(dto.scheduledStart !== undefined && {
          scheduledStart: dto.scheduledStart,
        }),
        ...(dto.scheduledEnd !== undefined && {
          scheduledEnd: dto.scheduledEnd,
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
        ...(dto.netAmount !== undefined && { netAmount: dto.netAmount }),
        ...(dto.chartOfAccountId !== undefined && {
          chartOfAccountId: dto.chartOfAccountId,
        }),
        ...(dto.termDays !== undefined && { termDays: dto.termDays }),
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
        ...(dto.serviceItems && {
          serviceItems: { deleteMany: {}, create: dto.serviceItems },
        }),
        ...(dto.productItems && {
          productItems: { deleteMany: {}, create: dto.productItems },
        }),
      },
      include: includeRelations,
    });
  }

  async updateStatus(
    id: string,
    status: ServiceOrderStatus,
    userId: string,
    extra?: Prisma.ServiceOrderUpdateInput,
  ): Promise<ServiceOrder> {
    return this.prisma.serviceOrder.update({
      where: { id },
      data: { status, updatedById: userId, ...extra },
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.serviceOrder.delete({ where: { id } });
  }
}
