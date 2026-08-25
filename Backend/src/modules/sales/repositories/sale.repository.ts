import { Injectable } from '@nestjs/common';
import { Prisma, Sale, SaleStatus } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { calculateDueDate } from '../../../core/utils/business-day.util';

import { CreateSaleDto } from '../dto/create-sale.dto';
import { SaleFilterDto } from '../dto/sale-filter.dto';

const includeRelations = {
  partner: true,
  warehouse: true,
  // A tela mostra "código — descrição" do tipo de despesa/receita, não o id.
  chartOfAccount: {
    select: { id: true, code: true, description: true },
  },
  items: {
    include: {
      product: true,
    },
  },
  // Pra conferência: mostra todos os títulos que essa venda gerou no
  // financeiro (uma parcela vira uma FinancialEntry cada) — não só o
  // vencimento único que fica no próprio registro da venda.
  financialEntries: {
    orderBy: { dueDate: 'asc' },
  },
} satisfies Prisma.SaleInclude;

@Injectable()
export class SaleRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    tx: Prisma.TransactionClient,
    companyId: string,
    number: number,
    dto: CreateSaleDto,
    totalAmount: number,
    netAmount: number,
    userId: string,
  ): Promise<Sale> {
    const issueDate = dto.saleDate
      ? new Date(dto.saleDate)
      : new Date();

    const termDays = dto.termDays ?? 0;

    return tx.sale.create({
      data: {
        companyId,
        number,

        partnerId: dto.partnerId,
        warehouseId: dto.warehouseId,

        saleDate: dto.saleDate
          ? new Date(dto.saleDate)
          : undefined,
        observation: dto.observation,
        chartOfAccountId: dto.chartOfAccountId,

        discountValue: dto.discountValue ?? 0,
        freightValue: dto.freightValue ?? 0,
        otherExpenses: dto.otherExpenses ?? 0,

        totalAmount,
        netAmount,

        termDays,
        installmentsCount: dto.installmentsCount,
        dueDate: calculateDueDate(issueDate, termDays),
        paymentMethod: dto.paymentMethod,

        quoteId: dto.quoteId,
        salesOrderId: dto.salesOrderId,
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
    filter: SaleFilterDto,
  ) {
    const where: Prisma.SaleWhereInput = {
      companyId,
    };

    if (filter.partnerId) {
      where.partnerId = filter.partnerId;
    }

    if (filter.warehouseId) {
      where.warehouseId = filter.warehouseId;
    }

    if (filter.status) {
      where.status = filter.status as SaleStatus;
    }

    if (filter.search) {
      const search = filter.search.trim();
      const asNumber = Number(search.replace(/\D/g, ''));

      where.OR = [
        {
          partner: {
            tradeName: { contains: search, mode: 'insensitive' },
          },
        },
        {
          partner: {
            legalName: { contains: search, mode: 'insensitive' },
          },
        },
        ...(Number.isFinite(asNumber) && asNumber > 0
          ? [{ number: asNumber }]
          : []),
      ];
    }

    return this.prisma.sale.findMany({
      where,

      include: includeRelations,

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(
    companyId: string,
    id: string,
  ) {
    return this.prisma.sale.findFirst({
      where: {
        id,
        companyId,
      },

      include: includeRelations,
    });
  }

  async update(
    id: string,
    dto: {
      partnerId?: string;
      warehouseId?: string;
      saleDate?: Date;
      observation?: string;
      chartOfAccountId?: string;
      discountValue?: number;
      freightValue?: number;
      otherExpenses?: number;
      termDays?: number;
      dueDate?: Date;
      paymentMethod?: CreateSaleDto['paymentMethod'];
      totalAmount?: number;
      netAmount?: number;
      items?: {
        productId: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }[];
    },
    userId: string,
  ): Promise<Sale> {
    return this.prisma.sale.update({
      where: { id },
      data: {
        updatedById: userId,
        ...(dto.partnerId && { partnerId: dto.partnerId }),
        ...(dto.warehouseId && {
          warehouseId: dto.warehouseId,
        }),
        ...(dto.saleDate !== undefined && {
          saleDate: dto.saleDate,
        }),
        ...(dto.observation !== undefined && {
          observation: dto.observation,
        }),
        ...(dto.chartOfAccountId !== undefined && {
          chartOfAccountId: dto.chartOfAccountId,
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
        ...(dto.termDays !== undefined && {
          termDays: dto.termDays,
        }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate,
        }),
        ...(dto.paymentMethod !== undefined && {
          paymentMethod: dto.paymentMethod,
        }),
        ...(dto.totalAmount !== undefined && {
          totalAmount: dto.totalAmount,
        }),
        ...(dto.netAmount !== undefined && {
          netAmount: dto.netAmount,
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
}