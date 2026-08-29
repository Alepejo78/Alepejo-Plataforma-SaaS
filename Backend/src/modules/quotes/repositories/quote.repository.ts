import { Injectable } from '@nestjs/common';
import { PaymentMethod, Prisma, Quote } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateQuoteDto } from '../dto/create-quote.dto';
import { QuoteFilterDto } from '../dto/quote-filter.dto';

const includeRelations = {
  partner: true,
  warehouse: true,
  // A tela mostra "código — descrição" do tipo de receita, não o id.
  chartOfAccount: {
    select: { id: true, code: true, description: true },
  },
  items: {
    include: {
      product: { include: { saleChartOfAccount: true } },
    },
  },
  sale: true,
  salesOrder: true,
};

@Injectable()
export class QuoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tx: Prisma.TransactionClient,
    companyId: string,
    number: number,
    dto: CreateQuoteDto,
    totalAmount: number,
    netAmount: number,
    userId: string,
  ) {
    return tx.quote.create({
      data: {
        companyId,
        number,
        partnerId: dto.partnerId,
        warehouseId: dto.warehouseId,
        quoteDate: dto.quoteDate
          ? new Date(dto.quoteDate)
          : undefined,
        validUntil: dto.validUntil
          ? new Date(dto.validUntil)
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

  async findAll(companyId: string, filter: QuoteFilterDto) {
    const where: Prisma.QuoteWhereInput = {
      companyId,
      ...(filter.partnerId && { partnerId: filter.partnerId }),
      ...(filter.warehouseId && {
        warehouseId: filter.warehouseId,
      }),
      ...(filter.status && { status: filter.status }),
    };

    return this.prisma.quote.findMany({
      where,
      include: includeRelations,
      orderBy: { number: 'desc' },
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.quote.findFirst({
      where: { id, companyId },
      include: includeRelations,
    });
  }

  async update(
    id: string,
    dto: {
      partnerId?: string;
      warehouseId?: string;
      quoteDate?: Date;
      validUntil?: Date;
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
  ): Promise<Quote> {
    return this.prisma.quote.update({
      where: { id },
      data: {
        updatedById: userId,
        ...(dto.partnerId && { partnerId: dto.partnerId }),
        ...(dto.warehouseId && {
          warehouseId: dto.warehouseId,
        }),
        ...(dto.quoteDate !== undefined && {
          quoteDate: dto.quoteDate,
        }),
        ...(dto.validUntil !== undefined && {
          validUntil: dto.validUntil,
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

  async cancel(id: string, userId: string): Promise<Quote> {
    return this.prisma.quote.update({
      where: { id },
      data: { status: 'CANCELLED', updatedById: userId },
    });
  }

  async approve(id: string, userId: string): Promise<Quote> {
    return this.prisma.quote.update({
      where: { id },
      data: { status: 'APPROVED', updatedById: userId },
      include: includeRelations,
    });
  }
}
