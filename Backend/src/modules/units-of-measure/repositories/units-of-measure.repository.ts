import { Injectable } from '@nestjs/common';
import { Prisma, UnitOfMeasure } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateUnitOfMeasureDto } from '../dto/create-unit-of-measure.dto';
import { UpdateUnitOfMeasureDto } from '../dto/update-unit-of-measure.dto';
import { UnitOfMeasureFilterDto } from '../dto/unit-of-measure-filter.dto';

@Injectable()
export class UnitsOfMeasureRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    data: CreateUnitOfMeasureDto,
  ): Promise<UnitOfMeasure> {
    return this.prisma.unitOfMeasure.create({
      data: {
        companyId: data.companyId,
        code: data.code,
        description: data.description,
        active: data.active ?? true,
      },
    });
  }

  async findById(
    id: string,
  ): Promise<UnitOfMeasure | null> {
    return this.prisma.unitOfMeasure.findUnique({
      where: {
        id,
      },
    });
  }

  async findByCode(
    companyId: string,
    code: string,
  ): Promise<UnitOfMeasure | null> {
    return this.prisma.unitOfMeasure.findFirst({
      where: {
        companyId,
        code,
      },
    });
  }

  async findByDescription(
    companyId: string,
    description: string,
  ): Promise<UnitOfMeasure | null> {
    return this.prisma.unitOfMeasure.findFirst({
      where: {
        companyId,
        description,
      },
    });
  }

  async findAll(
    filter: UnitOfMeasureFilterDto,
  ) {
    const {
      companyId,
      search,
      page,
      limit,
      orderBy,
      order,
    } = filter;

    const where: Prisma.UnitOfMeasureWhereInput = {
      companyId,

      ...(search
        ? {
            OR: [
              {
                code: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                description: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.unitOfMeasure.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: {
            [orderBy]: order,
          },
        }),

        this.prisma.unitOfMeasure.count({
          where,
        }),
      ]);

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async update(
    id: string,
    data: UpdateUnitOfMeasureDto,
  ): Promise<UnitOfMeasure> {
    return this.prisma.unitOfMeasure.update({
      where: {
        id,
      },
      data: {
        ...(data.code !== undefined && {
          code: data.code,
        }),

        ...(data.description !== undefined && {
          description: data.description,
        }),

        ...(data.active !== undefined && {
          active: data.active,
        }),
      },
    });
  }

  async delete(
    id: string,
  ): Promise<UnitOfMeasure> {
    return this.prisma.unitOfMeasure.update({
      where: {
        id,
      },
      data: {
        active: false,
      },
    });
  }
}