import { api } from "./api";
import type { PaymentMethod } from "./financial-entry.service";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type SalesOrderStatus =
  | "DRAFT"
  | "PARTIALLY_CONVERTED"
  | "CONVERTED"
  | "CANCELLED";

export const SALES_ORDER_STATUS_LABELS: Record<
  SalesOrderStatus,
  string
> = {
  DRAFT: "Rascunho",
  PARTIALLY_CONVERTED: "Parcialmente convertido",
  CONVERTED: "Convertido em venda",
  CANCELLED: "Cancelado",
};

export interface SalesOrderItem {
  id: string;
  productId: string;
  quantity: string | number;
  unitPrice: string | number;
  totalPrice: string | number;
  convertedQuantity: string | number;
  discardedQuantity: string | number;

  product?: {
    id: string;
    code: string;
    description: string;
    unit?: { code: string } | null;
    saleChartOfAccountId?: string | null;
    saleChartOfAccount?: {
      code: string;
      description: string;
    } | null;
  } | null;
}

export interface SalesOrder {
  id: string;
  number: number;
  partnerId: string;
  warehouseId: string;
  status: SalesOrderStatus;
  orderDate?: string | null;
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
  /** Parcelas planejadas — herdadas do Orçamento na aprovação ou digitadas direto no pedido. */
  plannedInstallments?: { dueDate: string; amount: number }[] | null;
  /** Preenchido quando o pedido pode virar Venda — automático se veio de um Orçamento aprovado, manual via approve(). */
  approvedAt?: string | null;
  createdAt: string;
  createdByName?: string | null;
  updatedByName?: string | null;
  items: SalesOrderItem[];

  partner?: {
    id: string;
    legalName: string;
    tradeName?: string | null;
    document?: string;
  } | null;

  warehouse?: {
    id: string;
    code: string;
    description: string;
  } | null;

  chartOfAccount?: {
    id: string;
    code: string;
    description: string;
  } | null;
}

export interface SalesOrderItemPayload {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface SalesOrderPayload {
  partnerId: string;
  warehouseId: string;
  orderDate?: string;
  observation?: string;
  discountValue?: number;
  freightValue?: number;
  otherExpenses?: number;
  chartOfAccountId?: string;
  termDays?: number;
  paymentMethod?: PaymentMethod;
  installmentsCount?: number;
  /** Parcelas planejadas na hora do pedido — tem prioridade sobre installmentsCount. */
  installments?: { dueDate: string; amount: number }[];
  items: SalesOrderItemPayload[];
}

export interface SalesOrderFilter {
  partnerId?: string;
  warehouseId?: string;
  status?: SalesOrderStatus;
}

export const salesOrderService = {
  async list(
    filter: SalesOrderFilter = {}
  ): Promise<SalesOrder[]> {
    const { data } = await api.get<
      ApiEnvelope<SalesOrder[]>
    >("/sales-orders", { params: filter });

    return data.data ?? [];
  },

  async getById(id: string): Promise<SalesOrder> {
    const { data } = await api.get<ApiEnvelope<SalesOrder>>(
      `/sales-orders/${id}`
    );

    return data.data;
  },

  async create(
    payload: SalesOrderPayload
  ): Promise<SalesOrder> {
    const { data } = await api.post<ApiEnvelope<SalesOrder>>(
      "/sales-orders",
      payload
    );

    return data.data;
  },

  async update(
    id: string,
    payload: Partial<SalesOrderPayload>
  ): Promise<SalesOrder> {
    const { data } = await api.patch<ApiEnvelope<SalesOrder>>(
      `/sales-orders/${id}`,
      payload
    );

    return data.data;
  },

  async cancel(id: string): Promise<SalesOrder> {
    const { data } = await api.patch<ApiEnvelope<SalesOrder>>(
      `/sales-orders/${id}/cancel`
    );

    return data.data;
  },

  async closeBalance(id: string): Promise<SalesOrder> {
    const { data } = await api.patch<ApiEnvelope<SalesOrder>>(
      `/sales-orders/${id}/close-balance`
    );

    return data.data;
  },

  async approve(id: string): Promise<SalesOrder> {
    const { data } = await api.patch<ApiEnvelope<SalesOrder>>(
      `/sales-orders/${id}/approve`
    );

    return data.data;
  },

  async undoApproval(id: string): Promise<SalesOrder> {
    const { data } = await api.patch<ApiEnvelope<SalesOrder>>(
      `/sales-orders/${id}/undo-approval`
    );

    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/sales-orders/${id}`);
  },
};
