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
    companyId: string,
    data: CreateUnitOfMeasureDto,
  ): Promise<UnitOfMeasure> {
    return this.prisma.unitOfMeasure.create({
      data: {
        companyId,
        code: data.code,
        description: data.description,
        active: data.active ?? true,
      },
    });
  }

  async findById(
    companyId: string,
    id: string,
  ): Promise<UnitOfMeasure | null> {
    return this.prisma.unitOfMeasure.findFirst({
      where: {
        id,
        companyId,
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
    companyId: string,
    filter: UnitOfMeasureFilterDto,
  ) {
    const {
      search,
      page,
      limit,
      orderBy,
      order,
    } = filter;

    const where: Prisma.UnitOfMeasureWhereInput = {
      companyId,
      active: true,

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

  // Observação: Prisma só aceita campos únicos em `where` de update().
  // A checagem de que `id` pertence a `companyId` é feita no service
  // (via findById) ANTES de chamar estes métodos.
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

  /** Quantos produtos ativos usam esta unidade de medida — produto excluído (soft delete) não conta. */
  async countProducts(unitId: string): Promise<number> {
    return this.prisma.product.count({
      where: { unitId, deletedAt: null },
    });
  }

  /**
   * Reativa uma unidade excluída (soft delete) com o mesmo código,
   * em vez de criar uma linha nova (o índice único de companyId+code
   * não exclui unidades inativas, então um create() colidiria).
   */
  async restore(
    id: string,
    data: CreateUnitOfMeasureDto,
  ): Promise<UnitOfMeasure> {
    return this.prisma.unitOfMeasure.update({
      where: { id },
      data: {
        code: data.code,
        description: data.description,
        active: true,
      },
    });
  }
}
