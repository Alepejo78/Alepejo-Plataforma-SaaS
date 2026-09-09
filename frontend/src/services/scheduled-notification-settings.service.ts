import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export interface ScheduledNotificationSettings {
  id: string;
  companyId: string;
  announcementHeader: string | null;
  announcementFooter: string | null;
  examReminderSubject: string | null;
  examReminderMessage: string | null;
  birthdaySubject: string | null;
  birthdayMessage: string | null;
  hourBankClosingSubject: string | null;
  hourBankClosingMessage: string | null;
  pointClosingSubject: string | null;
  pointClosingMessage: string | null;
  paymentReminderBeforeSubject: string | null;
  paymentReminderBeforeMessage: string | null;
  paymentReminderOverdueSubject: string | null;
  paymentReminderOverdueMessage: string | null;
}

export type ScheduledNotificationSettingsPayload = Partial<
  Omit<ScheduledNotificationSettings, "id" | "companyId">
>;

export const scheduledNotificationSettingsService = {
  async get(): Promise<ScheduledNotificationSettings> {
    const { data } = await api.get<
      ApiEnvelope<ScheduledNotificationSettings>
    >("/scheduled-notification-settings");

    return data.data;
  },

  async update(
    payload: ScheduledNotificationSettingsPayload
  ): Promise<ScheduledNotificationSettings> {
    const { data } = await api.put<
      ApiEnvelope<ScheduledNotificationSettings>
    >("/scheduled-notification-settings", payload);

    return data.data;
  },
};
