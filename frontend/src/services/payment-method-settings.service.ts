import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type SurchargeType = "PERCENT" | "FIXED";

export interface PaymentMethodSettings {
  id: string;
  companyId: string;
  asaasEnabled: boolean;
  asaasSandbox: boolean;
  asaasWebhookToken: string;
  hasAsaasApiKey: boolean;
  defaultBankAccountId: string | null;
  boletoSurchargeType: SurchargeType | null;
  boletoSurchargeValue: string | number;
  transferSurchargeType: SurchargeType | null;
  transferSurchargeValue: string | number;
  pixSurchargeType: SurchargeType | null;
  pixSurchargeValue: string | number;
  cardSurchargeType: SurchargeType | null;
  cardSurchargeValue: string | number;
  cardMaxInstallments: number;
  cardInterestFreeInstallments: number;
  cardInterestRatePerInstallment: string | number;
}

export interface PaymentMethodSettingsPayload {
  asaasEnabled?: boolean;
  asaasApiKey?: string;
  asaasSandbox?: boolean;
  defaultBankAccountId?: string | null;
  boletoSurchargeType?: SurchargeType | null;
  boletoSurchargeValue?: number;
  transferSurchargeType?: SurchargeType | null;
  transferSurchargeValue?: number;
  pixSurchargeType?: SurchargeType | null;
  pixSurchargeValue?: number;
  cardSurchargeType?: SurchargeType | null;
  cardSurchargeValue?: number;
  cardMaxInstallments?: number;
  cardInterestFreeInstallments?: number;
  cardInterestRatePerInstallment?: number;
}

export interface TestAsaasResult {
  ok: boolean;
  message: string;
}

export const paymentMethodSettingsService = {
  async get(): Promise<PaymentMethodSettings> {
    const { data } = await api.get<ApiEnvelope<PaymentMethodSettings>>(
      "/payment-method-settings"
    );

    return data.data;
  },

  async update(
    payload: PaymentMethodSettingsPayload
  ): Promise<PaymentMethodSettings> {
    const { data } = await api.put<ApiEnvelope<PaymentMethodSettings>>(
      "/payment-method-settings",
      payload
    );

    return data.data;
  },

  async testAsaas(params: {
    apiKey?: string;
    sandbox?: boolean;
  }): Promise<TestAsaasResult> {
    const { data } = await api.post<ApiEnvelope<TestAsaasResult>>(
      "/payment-method-settings/test-asaas",
      params
    );

    return data.data;
  },

  async regenerateWebhookToken(): Promise<{ asaasWebhookToken: string }> {
    const { data } = await api.post<
      ApiEnvelope<{ asaasWebhookToken: string }>
    >("/payment-method-settings/regenerate-webhook-token");

    return data.data;
  },
};
