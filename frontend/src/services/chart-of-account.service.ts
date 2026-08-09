import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

interface Paged<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export type ChartOfAccountType = "RECEITA" | "DESPESA";

export const CHART_OF_ACCOUNT_TYPE_LABELS: Record<
  ChartOfAccountType,
  string
> = {
  RECEITA: "Receita",
  DESPESA: "Despesa",
};

export interface ChartOfAccount {
  id: string;
  code: string;
  classificationId: string;
  classification: {
    id: string;
    name: string;
  };
  description: string;
  type: ChartOfAccountType;
  parentId?: string | null;
  active: boolean;
  createdAt: string;
}

export interface ChartOfAccountPayload {
  code: string;
  classificationId: string;
  description: string;
  type: ChartOfAccountType;
  parentId?: string;
}

export interface ChartOfAccountFilter {
  search?: string;
  type?: ChartOfAccountType;
  page?: number;
  limit?: number;
}

export const chartOfAccountService = {
  async list(
    filter: ChartOfAccountFilter = {}
  ): Promise<Paged<ChartOfAccount>> {
    const { data } = await api.get<
      ApiEnvelope<Paged<ChartOfAccount>>
    >("/chart-of-accounts", {
      params: { limit: 200, ...filter },
    });

    return data.data;
  },

  async create(
    payload: ChartOfAccountPayload
  ): Promise<ChartOfAccount> {
    const { data } = await api.post<
      ApiEnvelope<ChartOfAccount>
    >("/chart-of-accounts", payload);

    return data.data;
  },

  async update(
    id: string,
    payload: Partial<ChartOfAccountPayload>
  ): Promise<ChartOfAccount> {
    const { data } = await api.patch<
      ApiEnvelope<ChartOfAccount>
    >(`/chart-of-accounts/${id}`, payload);

    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/chart-of-accounts/${id}`);
  },
};
