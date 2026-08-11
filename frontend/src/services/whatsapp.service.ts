import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type WhatsAppStatus =
  | "DISCONNECTED"
  | "CONNECTING"
  | "QR_PENDING"
  | "CONNECTED";

export interface WhatsAppConnectionState {
  status: WhatsAppStatus;
  qr: string | null;
}

export const whatsappService = {
  async getStatus(): Promise<WhatsAppConnectionState> {
    const { data } = await api.get<
      ApiEnvelope<WhatsAppConnectionState>
    >("/notifications/whatsapp/status");

    return data.data;
  },

  async connect(): Promise<WhatsAppConnectionState> {
    const { data } = await api.post<
      ApiEnvelope<WhatsAppConnectionState>
    >("/notifications/whatsapp/connect");

    return data.data;
  },

  async logout(): Promise<WhatsAppConnectionState> {
    const { data } = await api.post<
      ApiEnvelope<WhatsAppConnectionState>
    >("/notifications/whatsapp/logout");

    return data.data;
  },

  async sendTest(
    phone: string
  ): Promise<{ sent: boolean; error?: string }> {
    const { data } = await api.post<
      ApiEnvelope<{ sent: boolean; error?: string }>
    >("/notifications/whatsapp/test", { phone });

    return data.data;
  },
};
