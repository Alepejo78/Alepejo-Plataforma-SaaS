import { Injectable } from '@nestjs/common';
import { BudgetType } from '@prisma/client';

import { FinancialEntriesService } from '../../financial-entries/services/financial-entries.service';

import { BudgetsRepository } from '../repositories/budgets.repository';
import { UpsertBudgetDto } from '../dto/upsert-budget.dto';

export interface BudgetBucket {
  planned: number;
  realized: number;
}

function emptyBucket(): BudgetBucket {
  return { planned: 0, realized: 0 };
}

@Injectable()
export class BudgetsService {
  constructor(
    private readonly repository: BudgetsRepository,
    private readonly financialEntriesService: FinancialEntriesService,
  ) {}

  async getYear(companyId: string, year: number) {
    const [budgets, cashFlow] = await Promise.all([
      this.repository.findByYear(companyId, year),
      this.financialEntriesService.getCashFlow(
        companyId,
        year,
      ),
    ]);

    const planned = new Map<string, number>();

    for (const budget of budgets) {
      planned.set(
        `${budget.month}-${budget.type}`,
        Number(budget.plannedAmount),
      );
    }

    const totals = {
      receivable: emptyBucket(),
      payable: emptyBucket(),
    };

    const months = cashFlow.months.map((month) => {
      const receivable: BudgetBucket = {
        planned:
          planned.get(`${month.month}-${BudgetType.RECEITA}`) ??
          0,
        realized: month.receivable.settled,
      };

      const payable: BudgetBucket = {
        planned:
          planned.get(`${month.month}-${BudgetType.DESPESA}`) ??
          0,
        realized: month.payable.settled,
      };

      totals.receivable.planned += receivable.planned;
      totals.receivable.realized += receivable.realized;
      totals.payable.planned += payable.planned;
      totals.payable.realized += payable.realized;

      return { month: month.month, receivable, payable };
    });

    return { year, months, totals };
  }

  async upsert(companyId: string, dto: UpsertBudgetDto) {
    return this.repository.upsert(
      companyId,
      dto.year,
      dto.month,
      dto.type,
      dto.plannedAmount,
    );
  }
}
