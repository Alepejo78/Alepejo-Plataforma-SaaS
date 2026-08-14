import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export interface EmailSettings {
  host: string | null;
  port: number | null;
  user: string | null;
  hasPassword: boolean;
  fromEmail: string | null;
  fromName: string | null;
  enabled: boolean;
}

export type EmailSettingsPayload = {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  fromEmail?: string;
  fromName?: string;
  enabled?: boolean;
};

export const emailSettingsService = {
  async get(): Promise<EmailSettings> {
    const { data } = await api.get<ApiEnvelope<EmailSettings>>(
      "/notifications/email/settings"
    );

    return data.data;
  },

  async update(
    payload: EmailSettingsPayload
  ): Promise<EmailSettings> {
    const { data } = await api.put<ApiEnvelope<EmailSettings>>(
      "/notifications/email/settings",
      payload
    );

    return data.data;
  },

  async sendTest(
    to: string,
    message?: string
  ): Promise<{ sent: boolean; error?: string }> {
    const { data } = await api.post<
      ApiEnvelope<{ sent: boolean; error?: string }>
    >("/notifications/email/test", { to, message });

    return data.data;
  },
};
