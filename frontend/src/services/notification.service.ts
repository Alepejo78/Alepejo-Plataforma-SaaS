import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type NotificationType =
  | "BIRTHDAY_TODAY"
  | "EXAM_DUE"
  | "FINANCIAL_DUE_TODAY"
  | "FINANCIAL_OVERDUE"
  | "NEW_PARTNER"
  | "NEW_PRODUCT"
  | "NEW_EMPLOYEE"
  | "APPROVAL_PENDING"
  | "LICENSE_EXPIRING"
  | "LOW_STOCK"
  | "HOUR_BANK_CLOSING"
  | "POINT_MONTH_CLOSING";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl: string | null;
  documentRef: string | null;
  actorName: string | null;
  occurredAt: string;
}

export const notificationService = {
  async listUnread(): Promise<NotificationItem[]> {
    const { data } = await api.get<ApiEnvelope<NotificationItem[]>>(
      "/notifications"
    );

    return data.data;
  },

  async markAsRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  },
};
