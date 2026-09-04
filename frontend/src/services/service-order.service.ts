import { api } from "./api";
import type { PaymentMethod } from "./financial-entry.service";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type ServiceOrderStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "AWAITING_CONFIRMATION"
  | "REVISION_REQUESTED"
  | "CONFIRMED"
  | "CONVERTED"
  | "CANCELLED";

export const SERVICE_ORDER_STATUS_LABELS: Record<ServiceOrderStatus, string> =
  {
    DRAFT: "Aberta",
    IN_PROGRESS: "Em Execução",
    AWAITING_CONFIRMATION: "Aguardando confirmação do cliente",
    REVISION_REQUESTED: "Revisão solicitada",
    CONFIRMED: "Confirmada pelo cliente",
    CONVERTED: "Faturada",
    CANCELLED: "Cancelada",
  };

interface ServiceOrderProductRef {
  id: string;
  code: string;
  description: string;
  unit?: { code: string } | null;
  saleChartOfAccountId?: string | null;
  saleChartOfAccount?: { code: string; description: string } | null;
}

export interface ServiceOrderServiceItem {
  id: string;
  productId: string;
  description?: string | null;
  quantity: string | number;
  unitPrice: string | number;
  totalPrice: string | number;
  product?: ServiceOrderProductRef | null;
}

export interface ServiceOrderProductItem {
  id: string;
  productId: string;
  quantity: string | number;
  unitPrice: string | number;
  totalPrice: string | number;
  product?: ServiceOrderProductRef | null;
}

export interface ServiceOrder {
  id: string;
  number: number;
  partnerId: string;
  warehouseId: string;
  status: ServiceOrderStatus;
  description: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  completedAt?: string | null;
  observation?: string | null;
  discountValue: string | number;
  freightValue: string | number;
  otherExpenses: string | number;
  totalAmount: string | number;
  netAmount: string | number;
  chartOfAccountId?: string | null;
  termDays?: number | null;
  paymentMethod?: PaymentMethod | null;
  installmentsCount?: number | null;
  plannedInstallments?: { dueDate: string; amount: number }[] | null;
  quoteId?: string | null;
  createdAt: string;
  createdByName?: string | null;
  updatedByName?: string | null;
  serviceItems: ServiceOrderServiceItem[];
  productItems: ServiceOrderProductItem[];

  partner?: {
    id: string;
    legalName: string;
    tradeName?: string | null;
    document?: string;
  } | null;

  warehouse?: { id: string; code: string; description: string } | null;

  chartOfAccount?: { id: string; code: string; description: string } | null;

  salesOrder?: { id: string; number: number; status: string } | null;
}

export interface ServiceOrderServiceItemPayload {
  productId: string;
  description?: string;
  quantity: number;
  unitPrice: number;
}

export interface ServiceOrderProductItemPayload {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface ServiceOrderPayload {
  partnerId: string;
  warehouseId: string;
  description: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  observation?: string;
  discountValue?: number;
  freightValue?: number;
  otherExpenses?: number;
  chartOfAccountId?: string;
  termDays?: number;
  paymentMethod?: PaymentMethod;
  installmentsCount?: number;
  installments?: { dueDate: string; amount: number }[];
  quoteId?: string;
  serviceItems: ServiceOrderServiceItemPayload[];
  productItems: ServiceOrderProductItemPayload[];
}

export interface ServiceOrderFilter {
  partnerId?: string;
  warehouseId?: string;
  status?: ServiceOrderStatus;
}

export const serviceOrderService = {
  async list(filter: ServiceOrderFilter = {}): Promise<ServiceOrder[]> {
    const { data } = await api.get<ApiEnvelope<ServiceOrder[]>>(
      "/service-orders",
      { params: filter }
    );

    return data.data ?? [];
  },

  async getById(id: string): Promise<ServiceOrder> {
    const { data } = await api.get<ApiEnvelope<ServiceOrder>>(
      `/service-orders/${id}`
    );

    return data.data;
  },

  async create(payload: ServiceOrderPayload): Promise<ServiceOrder> {
    const { data } = await api.post<ApiEnvelope<ServiceOrder>>(
      "/service-orders",
      payload
    );

    return data.data;
  },

  async update(
    id: string,
    payload: Partial<ServiceOrderPayload>
  ): Promise<ServiceOrder> {
    const { data } = await api.patch<ApiEnvelope<ServiceOrder>>(
      `/service-orders/${id}`,
      payload
    );

    return data.data;
  },

  async startExecution(id: string): Promise<ServiceOrder> {
    const { data } = await api.patch<ApiEnvelope<ServiceOrder>>(
      `/service-orders/${id}/start-execution`
    );

    return data.data;
  },

  async complete(id: string): Promise<ServiceOrder> {
    const { data } = await api.patch<ApiEnvelope<ServiceOrder>>(
      `/service-orders/${id}/complete`
    );

    return data.data;
  },

  async sendConfirmation(
    id: string
  ): Promise<{ sent: boolean; channels: string[] }> {
    const { data } = await api.post<
      ApiEnvelope<{ sent: boolean; channels: string[] }>
    >(`/service-orders/${id}/send-confirmation`);

    return data.data;
  },

  async cancel(id: string): Promise<ServiceOrder> {
    const { data } = await api.patch<ApiEnvelope<ServiceOrder>>(
      `/service-orders/${id}/cancel`
    );

    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/service-orders/${id}`);
  },

  pdfUrl(id: string): string {
    return `${api.defaults.baseURL}/service-orders/${id}/pdf`;
  },
};
