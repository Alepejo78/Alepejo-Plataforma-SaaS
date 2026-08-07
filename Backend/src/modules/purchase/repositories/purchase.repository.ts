import { Injectable } from '@nestjs/common';
import {
  Prisma,
  Purchase,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreatePurchaseDto } from '../dto/create-purchase.dto';
import { PurchaseFilterDto } from '../dto/purchase-filter.dto';

@Injectable()
export class PurchaseRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    companyId: string,
    dto: CreatePurchaseDto,
    totalAmount: number,
  ): Promise<Purchase> {
    return this.prisma.purchase.create({
      data: {
        companyId,
        partnerId: dto.partnerId,
        warehouseId: dto.warehouseId,
        purchaseDate: dto.purchaseDate,
        observation: dto.observation,
        totalAmount,

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