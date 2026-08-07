import { Injectable } from '@nestjs/common';
import { Prisma, Sale, SaleStatus } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateSaleDto } from '../dto/create-sale.dto';
import { SaleFilterDto } from '../dto/sale-filter.dto';

@Injectable()
export class SaleRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    companyId: string,
    dto: CreateSaleDto,
    totalAmount: number,
    netAmount: number,
  ): Promise<Sale> {
    return this.prisma.sale.create({
      data: {
        companyId,

        partnerId: dto.partnerId,
        warehouseId: dto.warehouseId,

        saleDate: dto.saleDate,
        observation: dto.observation,

        discountValue: dto.discountValue ?? 0,
        freightValue: dto.freightValue ?? 0,
        otherExpenses: dto.otherExpenses ?? 0,

        totalAmount,
        netAmount,

        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
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

    return this.prisma.sale.findMany({
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
    return this.prisma.sale.findFirst({
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