import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { StockHoldFilterDto } from '../dto/stock-hold-filter.dto';

@Injectable()
export class StockHoldRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, filter: StockHoldFilterDto) {
    const where: Prisma.StockHoldWhereInput = {
      companyId,
      ...(filter.inventoryId && { inventoryId: filter.inventoryId }),
      ...(filter.type && { type: filter.type }),
      ...(filter.status && { status: filter.status }),
    };

    return this.prisma.stockHold.findMany({
      where,
      include: {
        inventory: {
          include: {
            product: true,
            warehouse: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.stockHold.findFirst({
      where: { id, companyId },
      include: {
        inventory: {
          include: {
            product: true,
            warehouse: true,
          },
        },
      },
    });
  }
}
