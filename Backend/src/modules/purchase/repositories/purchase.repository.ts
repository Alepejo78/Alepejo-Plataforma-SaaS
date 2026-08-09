import { Injectable } from '@nestjs/common';
import {
  Prisma,
  Purchase,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';
import { calculateDueDate } from '../../../core/utils/business-day.util';

import { CreatePurchaseDto } from '../dto/create-purchase.dto';
import { PurchaseFilterDto } from '../dto/purchase-filter.dto';

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
        totalAmount,
        termDays,
        dueDate: calculateDueDate(issueDate, termDays),
        paymentMethod: dto.paymentMethod,
        purchaseOrderId: dto.purchaseOrderId,

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
      include: {
        partner: true,
        warehouse: true,
        items: {
          include: {
            product: true,
          },
        },
      },
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
      include: {
        partner: true,
        warehouse: true,
        items: {
          include: {
            product: true,
          },
        },
      },
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
      include: {
        partner: true,
        warehouse: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }
}