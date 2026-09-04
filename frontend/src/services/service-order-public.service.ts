import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export interface ServiceOrderPublicItem {
  description: string;
  detail?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ServiceOrderPublicInfo {
  orderNumber: string;
  companyName: string;
  companyLogo?: string | null;
  partnerName: string;
  description: string;
  completedAt?: string | null;
  serviceItems: ServiceOrderPublicItem[];
  productItems: ServiceOrderPublicItem[];
  netAmount: number;
  status:
    | "DRAFT"
    | "IN_PROGRESS"
    | "AWAITING_CONFIRMATION"
    | "REVISION_REQUESTED"
    | "CONFIRMED"
    | "CONVERTED"
    | "CANCELLED";
  customerRevisionNote?: string | null;
  customerCancelReason?: string | null;
}

export const serviceOrderPublicService = {
  async getInfo(id: string, token: string): Promise<ServiceOrderPublicInfo> {
    const { data } = await api.get<ApiEnvelope<ServiceOrderPublicInfo>>(
      `/service-orders/public/${id}`,
      { params: { token } }
    );

    return data.data;
  },

  async confirm(id: string, token: string): Promise<{ success: boolean }> {
    const { data } = await api.post<ApiEnvelope<{ success: boolean }>>(
      `/service-orders/public/${id}/confirm`,
      {},
      { params: { token } }
    );

    return data.data;
  },

  async requestRevision(
    id: string,
    token: string,
    message: string
  ): Promise<{ success: boolean }> {
    const { data } = await api.post<ApiEnvelope<{ success: boolean }>>(
      `/service-orders/public/${id}/request-revision`,
      { message },
      { params: { token } }
    );

    return data.data;
  },

  async cancel(
    id: string,
    token: string,
    reason: string
  ): Promise<{ success: boolean }> {
    const { data } = await api.post<ApiEnvelope<{ success: boolean }>>(
      `/service-orders/public/${id}/cancel`,
      { reason },
      { params: { token } }
    );

    return data.data;
  },
};
