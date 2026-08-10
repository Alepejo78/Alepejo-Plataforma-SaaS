import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type BudgetType = "RECEITA" | "DESPESA";

export interface BudgetBucket {
  planned: number;
  realized: number;
}

export interface BudgetMonth {
  month: number;
  receivable: BudgetBucket;
  payable: BudgetBucket;
}

export interface BudgetYear {
  year: number;
  months: BudgetMonth[];
  totals: {
    receivable: BudgetBucket;
    payable: BudgetBucket;
  };
}

export interface UpsertBudgetPayload {
  year: number;
  month: number;
  type: BudgetType;
  plannedAmount: number;
}

export const budgetService = {
  async getYear(year: number): Promise<BudgetYear> {
    const { data } = await api.get<ApiEnvelope<BudgetYear>>(
      "/budgets",
      { params: { year } }
    );

    return data.data;
  },

  async upsert(payload: UpsertBudgetPayload): Promise<void> {
    await api.put("/budgets", payload);
  },
};
