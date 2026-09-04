import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export interface PaymentReminderSettings {
  id: string;
  companyId: string;
  daysBeforeDue: number;
  daysAfterDue: number;
}

export interface PaymentReminderSettingsPayload {
  daysBeforeDue?: number;
  daysAfterDue?: number;
}

export const paymentReminderSettingsService = {
  async get(): Promise<PaymentReminderSettings> {
    const { data } = await api.get<ApiEnvelope<PaymentReminderSettings>>(
      "/payment-reminder-settings"
    );

    return data.data;
  },

  async update(
    payload: PaymentReminderSettingsPayload
  ): Promise<PaymentReminderSettings> {
    const { data } = await api.put<ApiEnvelope<PaymentReminderSettings>>(
      "/payment-reminder-settings",
      payload
    );

    return data.data;
  },
};
