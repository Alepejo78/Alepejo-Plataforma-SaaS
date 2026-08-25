import { Injectable } from '@nestjs/common';
import {
  Prisma,
  Purchase,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { calculateDueDate } from '../../../core/utils/business-day.util';

import { CreatePurchaseDto } from '../dto/create-purchase.dto';
import { PurchaseFilterDto } from '../dto/purchase-filter.dto';

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
  // Pra conferência: mostra todos os títulos que essa compra gerou no
  // financeiro (uma parcela vira uma FinancialEntry cada) — não só o
  // vencimento único que fica no próprio registro da compra.
  financialEntries: {
    orderBy: { dueDate: 'asc' },
  },
} satisfies Prisma.PurchaseInclude;

@Injectable()
export class PurchaseRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    tx: Prisma.TransactionClient,
    companyId: string,
    number: number,
    dto: CreatePurchaseDto,
    totalAmount: number,
    userId: string,
  ): Promise<Purchase> {
    const issueDate = dto.purchaseDate
      ? new Date(dto.purchaseDate)
      : new Date();

    const termDays = dto.termDays ?? 0;

    return tx.purchase.create({
      data: {
        companyId,
        number,
        partnerId: dto.partnerId,
        warehouseId: dto.warehouseId,
        purchaseDate: dto.purchaseDate
          ? new Date(dto.purchaseDate)
          : undefined,
        observation: dto.observation,
        chartOfAccountId: dto.chartOfAccountId,
        totalAmount,
        termDays,
        installmentsCount: dto.installmentsCount,
        dueDate: calculateDueDate(issueDate, termDays),
        paymentMethod: dto.paymentMethod,
        purchaseOrderId: dto.purchaseOrderId,
        invoiceNumber: dto.invoiceNumber,
        invoiceKey: dto.invoiceKey,
        invoiceIssueDate: dto.invoiceIssueDate
          ? new Date(dto.invoiceIssueDate)
          : undefined,
        createdById: userId,
        updatedById: userId,

        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice:
              item.quantity * item.unitPrice,
          })),
        },
      },
      include: includeRelations,
    });
  }

  async findAll(
    companyId: string,
    filter: PurchaseFilterDto,
  ) {
    const where: Prisma.PurchaseWhereInput = {
      companyId,
    };

    if (filter.partnerId) {
      where.partnerId = filter.partnerId;
    }

    if (filter.warehouseId) {
      where.warehouseId = filter.warehouseId;
    }

    if (filter.status) {
      where.status = filter.status;
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

    return this.prisma.purchase.findMany({
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
    return this.prisma.purchase.findFirst({
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
      purchaseDate?: Date;
      observation?: string;
      chartOfAccountId?: string;
      termDays?: number;
      dueDate?: Date;
      paymentMethod?: CreatePurchaseDto['paymentMethod'];
      totalAmount?: number;
      items?: {
        productId: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }[];
    },
    userId: string,
  ): Promise<Purchase> {
    return this.prisma.purchase.update({
      where: { id },
      data: {
        updatedById: userId,
        ...(dto.partnerId && { partnerId: dto.partnerId }),
        ...(dto.warehouseId && {
          warehouseId: dto.warehouseId,
        }),
        ...(dto.purchaseDate !== undefined && {
          purchaseDate: dto.purchaseDate,
        }),
        ...(dto.observation !== undefined && {
          observation: dto.observation,
        }),
        ...(dto.chartOfAccountId !== undefined && {
          chartOfAccountId: dto.chartOfAccountId,
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