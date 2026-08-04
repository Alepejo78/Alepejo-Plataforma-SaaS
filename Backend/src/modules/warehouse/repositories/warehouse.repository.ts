import { Injectable } from '@nestjs/common';
import { Prisma, Warehouse } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';
import { WarehouseFilterDto } from '../dto/warehouse-filter.dto';

@Injectable()
export class WarehouseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    dto: CreateWarehouseDto,
  ): Promise<Warehouse> {
    return this.prisma.warehouse.create({
      data: {
        companyId,
        code: dto.code,
        description: dto.description,
        active: dto.active ?? true,
      },
    });
  }

  async findAll(
    companyId: string,
    filter: WarehouseFilterDto,
  ): Promise<Warehouse[]> {
    const where: Prisma.WarehouseWhereInput = {
      companyId,
    };

    if (filter.search) {
      where.OR = [
        {
          code: {
            contains: filter.search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: filter.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (filter.active !== undefined) {
      where.active = filter.active === 'true';
    }

    return this.prisma.warehouse.findMany({
      where,
      orderBy: {
        description: 'asc',
      },
    });
  }

  async findById(
    companyId: string,
    id: string,
  ): Promise<Warehouse | null> {
    return this.prisma.warehouse.findFirst({
      where: {
        id,
        companyId,
      },
    });
  }

  async findByCode(
    companyId: string,
    code: string,
  ): Promise<Warehouse | null> {
    return this.prisma.warehouse.findFirst({
      where: {
        companyId,
        code,
      },
    });
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateWarehouseDto,
  ): Promise<Warehouse> {
    return this.prisma.warehouse.update({
      where: {
        id,
      },
      data: {
        ...dto,
      },
    });
  }

  async remove(
    companyId: string,
    id: string,
  ): Promise<Warehouse> {
    return this.prisma.warehouse.delete({
      where: {
        id,
      },
    });
  }
}