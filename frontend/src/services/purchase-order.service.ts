import { api } from "./api";
import type { PaymentMethod } from "./financial-entry.service";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type PurchaseOrderStatus =
  | "DRAFT"
  | "PARTIALLY_CONVERTED"
  | "CONVERTED"
  | "CANCELLED";

export const PURCHASE_ORDER_STATUS_LABELS: Record<
  PurchaseOrderStatus,
  string
> = {
  DRAFT: "Rascunho",
  PARTIALLY_CONVERTED: "Parcialmente convertido",
  CONVERTED: "Convertido em compra",
  CANCELLED: "Cancelado",
};

export interface PurchaseOrderItem {
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
    chartOfAccountId?: string | null;
    chartOfAccount?: {
      code: string;
      description: string;
    } | null;
  } | null;
}

export interface PurchaseOrder {
  id: string;
  number: number;
  partnerId: string;
  warehouseId: string;
  status: PurchaseOrderStatus;
  orderDate?: string | null;
  observation?: string | null;
  totalAmount: string | number;
  quotationId?: string | null;
  quotationOfferId?: string | null;
  chartOfAccountId?: string | null;
  termDays?: number | null;
  paymentMethod?: PaymentMethod | null;
  installmentsCount?: number | null;
  createdAt: string;
  createdByName?: string | null;
  updatedByName?: string | null;
  items: PurchaseOrderItem[];

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

export interface PurchaseOrderItemPayload {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrderPayload {
  partnerId: string;
  warehouseId: string;
  orderDate?: string;
  observation?: string;
  quotationId?: string;
  quotationOfferId?: string;
  chartOfAccountId?: string;
  termDays?: number;
  paymentMethod?: PaymentMethod;
  installmentsCount?: number;
  items: PurchaseOrderItemPayload[];
}

export interface PurchaseOrderFilter {
  partnerId?: string;
  warehouseId?: string;
  status?: PurchaseOrderStatus;
}

export const purchaseOrderService = {
  async list(
    filter: PurchaseOrderFilter = {}
  ): Promise<PurchaseOrder[]> {
    const { data } = await api.get<
      ApiEnvelope<PurchaseOrder[]>
    >("/purchase-orders", { params: filter });

    return data.data ?? [];
  },

  async getById(id: string): Promise<PurchaseOrder> {
    const { data } = await api.get<
      ApiEnvelope<PurchaseOrder>
    >(`/purchase-orders/${id}`);

    return data.data;
  },

  async create(
    payload: PurchaseOrderPayload
  ): Promise<PurchaseOrder> {
    const { data } = await api.post<
      ApiEnvelope<PurchaseOrder>
    >("/purchase-orders", payload);

    return data.data;
  },

  async update(
    id: string,
    payload: Partial<PurchaseOrderPayload>
  ): Promise<PurchaseOrder> {
    const { data } = await api.patch<
      ApiEnvelope<PurchaseOrder>
    >(`/purchase-orders/${id}`, payload);

    return data.data;
  },

  async cancel(id: string): Promise<PurchaseOrder> {
    const { data } = await api.patch<
      ApiEnvelope<PurchaseOrder>
    >(`/purchase-orders/${id}/cancel`);

    return data.data;
  },

  async reopen(id: string): Promise<PurchaseOrder> {
    const { data } = await api.patch<
      ApiEnvelope<PurchaseOrder>
    >(`/purchase-orders/${id}/reopen`);

    return data.data;
  },

  async closeBalance(id: string): Promise<PurchaseOrder> {
    const { data } = await api.patch<
      ApiEnvelope<PurchaseOrder>
    >(`/purchase-orders/${id}/close-balance`);

    return data.data;
  },
};
