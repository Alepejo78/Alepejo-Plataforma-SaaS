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

export interface ChartOfAccountClassification {
  id: string;
  name: string;
  active: boolean;
  [key: string]: unknown;
}

export const chartOfAccountClassificationService = {
  async list(
    search?: string
  ): Promise<Paged<ChartOfAccountClassification>> {
    const { data } = await api.get<
      ApiEnvelope<Paged<ChartOfAccountClassification>>
    >("/chart-of-account-classifications", {
      params: { search, limit: 100 },
    });

    return data.data;
  },

  async create(
    payload: Record<string, unknown>
  ): Promise<ChartOfAccountClassification> {
    const { data } = await api.post<
      ApiEnvelope<ChartOfAccountClassification>
    >("/chart-of-account-classifications", payload);

    return data.data;
  },

  async update(
    id: string,
    payload: Record<string, unknown>
  ): Promise<ChartOfAccountClassification> {
    const { data } = await api.patch<
      ApiEnvelope<ChartOfAccountClassification>
    >(`/chart-of-account-classifications/${id}`, payload);

    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/chart-of-account-classifications/${id}`);
  },
};
