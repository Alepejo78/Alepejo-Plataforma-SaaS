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
        inventory: true,
      },
    });
  }

  async findAll(
    companyId: string,
    filter: StockMovementFilterDto,
  ) {
    return this.prisma.stockMovement.findMany({
      where: {
        companyId,
        ...filter,
      },
      include: {
        inventory: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}