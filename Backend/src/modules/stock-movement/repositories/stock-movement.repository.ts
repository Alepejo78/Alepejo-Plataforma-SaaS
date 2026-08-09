import { Injectable } from '@nestjs/common';
import {
  Prisma,
  StockMovement,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateStockMovementDto } from '../dto/create-stock-movement.dto';
import { StockMovementFilterDto } from '../dto/stock-movement-filter.dto';

@Injectable()
export class StockMovementRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    companyId: string,
    dto: CreateStockMovementDto,
    tx?: Prisma.TransactionClient,
  ): Promise<StockMovement> {
    const prisma = tx ?? this.prisma;

    return prisma.stockMovement.create({
      data: {
        companyId,
        inventoryId: dto.inventoryId,
        type: dto.type,
        quantity: dto.quantity,
        unitCost: dto.unitCost,
        observation: dto.observation,
        documentNumber: dto.documentNumber,
      },
    });
  }

  async findById(
    companyId: string,
    id: string,
  ): Promise<StockMovement | null> {
    return this.prisma.stockMovement.findFirst({
      where: {
        id,
        companyId,
      },
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

  async findAll(
    companyId: string,
    filter: StockMovementFilterDto,
  ) {
    const { inventoryId, type, search } = filter;

    const where: Prisma.StockMovementWhereInput = {
      companyId,
      ...(inventoryId && { inventoryId }),
      ...(type && { type }),

      ...(search && {
        OR: [
          {
            observation: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            documentNumber: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            inventory: {
              product: {
                OR: [
                  {
                    description: {
                      contains: search,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                  {
                    code: {
                      contains: search,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                ],
              },
            },
          },
        ],
      }),
    };

    return this.prisma.stockMovement.findMany({
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
}