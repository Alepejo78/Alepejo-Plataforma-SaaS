import { Injectable } from '@nestjs/common';
import { ChartOfAccount, Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateChartOfAccountDto } from '../dto/create-chart-of-account.dto';
import { UpdateChartOfAccountDto } from '../dto/update-chart-of-account.dto';
import { ChartOfAccountFilterDto } from '../dto/chart-of-account-filter.dto';

@Injectable()
export class ChartOfAccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    data: CreateChartOfAccountDto,
    userId: string,
  ): Promise<ChartOfAccount> {
    return this.prisma.chartOfAccount.create({
      data: {
        ...data,
        companyId,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async findById(
    companyId: string,
    id: string,
  ): Promise<ChartOfAccount | null> {
    return this.prisma.chartOfAccount.findFirst({
      where: { id, companyId },
      include: { classification: true },
    });
  }

  async findByCode(
    companyId: string,
    code: string,
  ): Promise<ChartOfAccount | null> {
    return this.prisma.chartOfAccount.findFirst({
      where: { companyId, code },
    });
  }

  async findAll(companyId: string, filter: ChartOfAccountFilterDto) {
    const { search, type, page, limit, orderBy, order } = filter;

    const where: Prisma.ChartOfAccountWhereInput = {
      companyId,
      active: true,

      ...(type && { type }),

      ...(search && {
        OR: [
          {
            code: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            classification: {
              name: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
          {
            description: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.chartOfAccount.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [orderBy]: order,
        },
        include: { classification: true },
      }),

      this.prisma.chartOfAccount.count({ where }),
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
    data: UpdateChartOfAccountDto,
    userId: string,
  ): Promise<ChartOfAccount> {
    return this.prisma.chartOfAccount.update({
      where: { id },
      data: { ...data, updatedById: userId },
    });
  }

  async delete(id: string): Promise<ChartOfAccount> {
    return this.prisma.chartOfAccount.update({
      where: { id },
      data: { active: false },
    });
  }

  /** Reativa uma conta excluída (soft delete) com o mesmo código. */
  async restore(
    id: string,
    data: CreateChartOfAccountDto,
    userId: string,
  ): Promise<ChartOfAccount> {
    return this.prisma.chartOfAccount.update({
      where: { id },
      data: {
        ...data,
        active: true,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  /** Quantas subcontas (filhas) esta conta tem. */
  async countChildren(id: string): Promise<number> {
    return this.prisma.chartOfAccount.count({
      where: { parentId: id, active: true },
    });
  }
}
