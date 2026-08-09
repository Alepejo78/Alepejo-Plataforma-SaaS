import { Injectable } from '@nestjs/common';
import {
  FinancialEntry,
  FinancialEntryStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

import { FinancialEntryFilterDto } from '../dto/financial-entry-filter.dto';

const includeRelations = {
  partner: true,
  chartOfAccount: {
    include: { classification: true },
  },
} satisfies Prisma.FinancialEntryInclude;

@Injectable()
export class FinancialEntriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    data: Prisma.FinancialEntryUncheckedCreateInput,
  ): Promise<FinancialEntry> {
    return this.prisma.financialEntry.create({
      data: { ...data, companyId },
      include: includeRelations,
    });
  }

  async findById(companyId: string, id: string) {
    return this.prisma.financialEntry.findFirst({
      where: { id, companyId },
      include: includeRelations,
    });
  }

  async findAll(
    companyId: string,
    filter: FinancialEntryFilterDto,
  ) {
    const {
      type,
      status,
      partnerId,
      search,
      dueFrom,
      dueTo,
      overdue,
      page,
      limit,
      orderBy,
      order,
    } = filter;

    const where: Prisma.FinancialEntryWhereInput = {
      companyId,

      ...(type && { type }),
      ...(status && { status }),
      ...(partnerId && { partnerId }),

      ...((dueFrom || dueTo) && {
        dueDate: {
          ...(dueFrom && { gte: new Date(dueFrom) }),
          ...(dueTo && { lte: new Date(dueTo) }),
        },
      }),

      // Vencidos = em aberto com vencimento anterior a hoje.
      ...(overdue === 'true' && {
        status: FinancialEntryStatus.OPEN,
        dueDate: { lt: new Date() },
      }),

      ...(search && {
        OR: [
          {
            documentNumber: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            observation: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            partner: {
              OR: [
                {
                  legalName: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  tradeName: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  document: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              ],
            },
          },
        ],
      }),
    };

    const [data, total, totals] = await this.prisma.$transaction([
      this.prisma.financialEntry.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [orderBy]: order },
        include: includeRelations,
      }),

      this.prisma.financialEntry.count({ where }),

      this.prisma.financialEntry.groupBy({
        by: ['status'],
        where,
        orderBy: { status: 'asc' },
        _sum: { amount: true, paidAmount: true },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      totals,
    };
  }

  /** Títulos do ano (não cancelados) para montar o fluxo de caixa mensal. */
  async findForCashFlow(companyId: string, year: number) {
    return this.prisma.financialEntry.findMany({
      where: {
        companyId,
        status: { not: FinancialEntryStatus.CANCELLED },
        dueDate: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
      },
      select: {
        type: true,
        status: true,
        amount: true,
        paidAmount: true,
        dueDate: true,
      },
    });
  }

  // Observação: Prisma só aceita campos únicos em `where` de update().
  // A checagem de tenant é feita no service (findById) ANTES daqui.
  async update(
    id: string,
    data: Prisma.FinancialEntryUncheckedUpdateInput,
  ): Promise<FinancialEntry> {
    return this.prisma.financialEntry.update({
      where: { id },
      data,
      include: includeRelations,
    });
  }

  async delete(id: string): Promise<FinancialEntry> {
    return this.prisma.financialEntry.delete({
      where: { id },
    });
  }
}
