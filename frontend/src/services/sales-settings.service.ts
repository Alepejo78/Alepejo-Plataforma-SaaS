import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export interface SalesSettings {
  id: string;
  companyId: string;
  maxInstallments: number;
  interestFreeInstallments: number;
  interestRatePerInstallment: string | number;
}

export interface SalesSettingsPayload {
  maxInstallments?: number;
  interestFreeInstallments?: number;
  interestRatePerInstallment?: number;
}

export const salesSettingsService = {
  async get(): Promise<SalesSettings> {
    const { data } = await api.get<ApiEnvelope<SalesSettings>>(
      "/sales-settings"
    );

    return data.data;
  },

  async update(
    payload: SalesSettingsPayload
  ): Promise<SalesSettings> {
    const { data } = await api.put<ApiEnvelope<SalesSettings>>(
      "/sales-settings",
      payload
    );

    return data.data;
  },
};
