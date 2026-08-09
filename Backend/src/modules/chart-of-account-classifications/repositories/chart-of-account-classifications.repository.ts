import { Injectable } from '@nestjs/common';
import {
  ChartOfAccountClassification,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { CreateChartOfAccountClassificationDto } from '../dto/create-chart-of-account-classification.dto';
import { UpdateChartOfAccountClassificationDto } from '../dto/update-chart-of-account-classification.dto';
import { ChartOfAccountClassificationFilterDto } from '../dto/chart-of-account-classification-filter.dto';

@Injectable()
export class ChartOfAccountClassificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    data: CreateChartOfAccountClassificationDto,
  ): Promise<ChartOfAccountClassification> {
    return this.prisma.chartOfAccountClassification.create({
      data: {
        ...data,
        companyId,
      },
    });
  }

  async findById(
    companyId: string,
    id: string,
  ): Promise<ChartOfAccountClassification | null> {
    return this.prisma.chartOfAccountClassification.findFirst({
      where: { id, companyId },
    });
  }

  async findByName(
    companyId: string,
    name: string,
  ): Promise<ChartOfAccountClassification | null> {
    return this.prisma.chartOfAccountClassification.findFirst({
      where: {
        companyId,
        name: {
          equals: name,
          mode: Prisma.QueryMode.insensitive,
        },
      },
    });
  }

  async findAll(
    companyId: string,
    filter: ChartOfAccountClassificationFilterDto,
  ) {
    const { search, page, limit, orderBy, order } = filter;

    const where: Prisma.ChartOfAccountClassificationWhereInput = {
      companyId,
      active: true,

      ...(search && {
        name: {
          contains: search,
          mode: Prisma.QueryMode.insensitive,
        },
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.chartOfAccountClassification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [orderBy]: order,
        },
      }),

      this.prisma.chartOfAccountClassification.count({ where }),
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
    data: UpdateChartOfAccountClassificationDto,
  ): Promise<ChartOfAccountClassification> {
    return this.prisma.chartOfAccountClassification.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<ChartOfAccountClassification> {
    return this.prisma.chartOfAccountClassification.update({
      where: { id },
      data: { active: false },
    });
  }

  /** Reativa uma classificação excluída com o mesmo nome. */
  async restore(
    id: string,
    data: CreateChartOfAccountClassificationDto,
  ): Promise<ChartOfAccountClassification> {
    return this.prisma.chartOfAccountClassification.update({
      where: { id },
      data: {
        ...data,
        active: true,
      },
    });
  }

  /** Quantas contas do plano de contas usam esta classificação. */
  async countAccounts(id: string): Promise<number> {
    return this.prisma.chartOfAccount.count({
      where: { classificationId: id, active: true },
    });
  }
}
