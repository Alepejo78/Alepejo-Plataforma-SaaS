import { Injectable } from '@nestjs/common';
import { Budget, BudgetType } from '@prisma/client';

import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class BudgetsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByYear(
    companyId: string,
    year: number,
  ): Promise<Budget[]> {
    return this.prisma.budget.findMany({
      where: { companyId, year },
    });
  }

  async upsert(
    companyId: string,
    year: number,
    month: number,
    type: BudgetType,
    plannedAmount: number,
  ): Promise<Budget> {
    return this.prisma.budget.upsert({
      where: {
        companyId_year_month_type: {
          companyId,
          year,
          month,
          type,
        },
      },
      update: { plannedAmount },
      create: {
        companyId,
        year,
        month,
        type,
        plannedAmount,
      },
    });
  }
}
