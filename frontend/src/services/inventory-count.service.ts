import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type InventoryCountStatus = "DRAFT" | "FINALIZED" | "CANCELLED";

export const INVENTORY_COUNT_STATUS_LABELS: Record<
  InventoryCountStatus,
  string
> = {
  DRAFT: "Rascunho",
  FINALIZED: "Finalizada",
  CANCELLED: "Cancelada",
};

export function formatInventoryCountNumber(n: number) {
  return `INV-${String(n).padStart(6, "0")}`;
}

export interface InventoryCountItem {
  id: string;
  productId: string;
  systemQuantity: string | number;
  countedQuantity: string | number | null;
  /** Só referência — já está incluído em systemQuantity, não desconta dele. */
  reservedQuantity?: string | number;

  product?: {
    id: string;
    code: string;
    description: string;
    unit?: { code: string } | null;
  } | null;
}

export interface InventoryCount {
  id: string;
  number: number;
  warehouseId: string;
  status: InventoryCountStatus;
  countDate?: string | null;
  observation: string;
  finalizedAt?: string | null;
  createdAt: string;
  createdByName?: string | null;
  updatedByName?: string | null;
  items: InventoryCountItem[];

  warehouse?: {
    id: string;
    code: string;
    description: string;
  } | null;
}

export interface InventoryCountItemPayload {
  productId: string;
  countedQuantity?: number;
}

export interface InventoryCountPayload {
  warehouseId: string;
  countDate?: string;
  observation: string;
  items: InventoryCountItemPayload[];
}

export interface InventoryCountFilter {
  warehouseId?: string;
  status?: InventoryCountStatus;
}

export const inventoryCountService = {
  async list(
    filter: InventoryCountFilter = {}
  ): Promise<InventoryCount[]> {
    const { data } = await api.get<ApiEnvelope<InventoryCount[]>>(
      "/inventory-counts",
      { params: filter }
    );

    return data.data ?? [];
  },

  async getById(id: string): Promise<InventoryCount> {
    const { data } = await api.get<ApiEnvelope<InventoryCount>>(
      `/inventory-counts/${id}`
    );

    return data.data;
  },

  async create(
    payload: InventoryCountPayload
  ): Promise<InventoryCount> {
    const { data } = await api.post<ApiEnvelope<InventoryCount>>(
      "/inventory-counts",
      payload
    );

    return data.data;
  },

  async update(
    id: string,
    payload: Partial<InventoryCountPayload>
  ): Promise<InventoryCount> {
    const { data } = await api.patch<ApiEnvelope<InventoryCount>>(
      `/inventory-counts/${id}`,
      payload
    );

    return data.data;
  },

  async finalize(id: string): Promise<InventoryCount> {
    const { data } = await api.patch<ApiEnvelope<InventoryCount>>(
      `/inventory-counts/${id}/finalize`
    );

    return data.data;
  },

  async cancel(id: string): Promise<InventoryCount> {
    const { data } = await api.patch<ApiEnvelope<InventoryCount>>(
      `/inventory-counts/${id}/cancel`
    );

    return data.data;
  },
};
