import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type ProductionOrderStatus =
  | "AGUARDANDO_PRODUCAO"
  | "EM_PRODUCAO"
  | "FINALIZADA"
  | "CANCELADA";

export const PRODUCTION_ORDER_STATUS_LABELS: Record<
  ProductionOrderStatus,
  string
> = {
  AGUARDANDO_PRODUCAO: "Aguardando produção",
  EM_PRODUCAO: "Em produção",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
};

export type ProductionOrderOrigin =
  | "MANUAL"
  | "SALES_ORDER"
  | "LOW_STOCK"
  | "SALE";

export const PRODUCTION_ORDER_ORIGIN_LABELS: Record<
  ProductionOrderOrigin,
  string
> = {
  MANUAL: "Manual",
  SALES_ORDER: "Pedido de venda",
  LOW_STOCK: "Estoque mínimo",
  SALE: "Venda",
};

export interface ProductionOrder {
  id: string;
  number: number;
  productId: string;
  warehouseId: string;
  quantity: string | number;
  origin: ProductionOrderOrigin;
  salesOrderId?: string | null;
  saleId?: string | null;
  status: ProductionOrderStatus;
  orderDate: string;
  productionDays: number;
  expectedDate?: string | null;
  completedAt?: string | null;
  observation?: string | null;
  completionObservation?: string | null;
  createdAt: string;

  product?: {
    id: string;
    code: string;
    description: string;
    unit?: { code: string } | null;
  } | null;

  warehouse?: {
    id: string;
    code: string;
    description: string;
  } | null;

  salesOrder?: { id: string; number: number } | null;
  sale?: { id: string; number: number } | null;
}

export interface ProductionOrderPayload {
  productId: string;
  warehouseId: string;
  quantity: number;
  productionDays: number;
  observation?: string;
}

export interface ProductionOrderFilter {
  productId?: string;
  warehouseId?: string;
  status?: ProductionOrderStatus;
  origin?: ProductionOrderOrigin;
}

export interface CompleteProductionOrderPayload {
  completedAt: string;
  observation?: string;
}

export interface ProductionSettings {
  id: string;
  companyId: string;
  minBatchSize: string | number;
  defaultProductionDays: number;
  autoGenerateOnSalesOrder: boolean;
  autoGenerateOnLowStock: boolean;
}

export interface ProductionSettingsPayload {
  minBatchSize?: number;
  defaultProductionDays?: number;
  autoGenerateOnSalesOrder?: boolean;
  autoGenerateOnLowStock?: boolean;
}

export function formatProductionOrderNumber(n: number) {
  return `OP-${String(n).padStart(6, "0")}`;
}

export const productionOrderService = {
  async list(
    filter: ProductionOrderFilter = {}
  ): Promise<ProductionOrder[]> {
    const { data } = await api.get<
      ApiEnvelope<ProductionOrder[]>
    >("/production-orders", { params: filter });

    return data.data ?? [];
  },

  async getById(id: string): Promise<ProductionOrder> {
    const { data } = await api.get<
      ApiEnvelope<ProductionOrder>
    >(`/production-orders/${id}`);

    return data.data;
  },

  async create(
    payload: ProductionOrderPayload
  ): Promise<ProductionOrder> {
    const { data } = await api.post<
      ApiEnvelope<ProductionOrder>
    >("/production-orders", payload);

    return data.data;
  },

  async update(
    id: string,
    payload: Partial<ProductionOrderPayload>
  ): Promise<ProductionOrder> {
    const { data } = await api.patch<
      ApiEnvelope<ProductionOrder>
    >(`/production-orders/${id}`, payload);

    return data.data;
  },

  async start(id: string): Promise<ProductionOrder> {
    const { data } = await api.patch<
      ApiEnvelope<ProductionOrder>
    >(`/production-orders/${id}/start`);

    return data.data;
  },

  async cancel(id: string): Promise<ProductionOrder> {
    const { data } = await api.patch<
      ApiEnvelope<ProductionOrder>
    >(`/production-orders/${id}/cancel`);

    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/production-orders/${id}`);
  },

  async complete(
    id: string,
    payload: CompleteProductionOrderPayload
  ): Promise<ProductionOrder> {
    const { data } = await api.patch<
      ApiEnvelope<ProductionOrder>
    >(`/production-orders/${id}/complete`, payload);

    return data.data;
  },

  async undoComplete(id: string): Promise<ProductionOrder> {
    const { data } = await api.patch<
      ApiEnvelope<ProductionOrder>
    >(`/production-orders/${id}/undo-complete`);

    return data.data;
  },
};

export const productionSettingsService = {
  async get(): Promise<ProductionSettings> {
    const { data } = await api.get<
      ApiEnvelope<ProductionSettings>
    >("/production-settings");

    return data.data;
  },

  async update(
    payload: ProductionSettingsPayload
  ): Promise<ProductionSettings> {
    const { data } = await api.put<
      ApiEnvelope<ProductionSettings>
    >("/production-settings", payload);

    return data.data;
  },
};
