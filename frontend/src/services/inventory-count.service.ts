import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type InventoryCountStatus =
  | "DRAFT"
  | "OPEN"
  | "COUNTING"
  | "FINALIZED"
  | "ADJUSTED"
  | "CANCELLED";

export const INVENTORY_COUNT_STATUS_LABELS: Record<
  InventoryCountStatus,
  string
> = {
  DRAFT: "Rascunho (legado)",
  OPEN: "Aberta",
  COUNTING: "Em contagem",
  FINALIZED: "Finalizada",
  ADJUSTED: "Ajustada",
  CANCELLED: "Cancelada",
};

export type InventoryCountItemStatus =
  | "PENDING"
  | "RECOUNT_2"
  | "RECOUNT_3"
  | "DONE";

export const INVENTORY_COUNT_ITEM_STATUS_LABELS: Record<
  InventoryCountItemStatus,
  string
> = {
  PENDING: "Pendente",
  RECOUNT_2: "Recontar (2ª)",
  RECOUNT_3: "Recontar (3ª)",
  DONE: "Finalizado",
};

export function formatInventoryCountNumber(n: number) {
  return `INV-${String(n).padStart(6, "0")}`;
}

export interface InventoryCountItem {
  id: string;
  productId: string;
  systemQuantity: string | number;
  countedQuantity1: string | number | null;
  countedQuantity2: string | number | null;
  countedQuantity3: string | number | null;
  countedByName1?: string | null;
  countedByName2?: string | null;
  countedByName3?: string | null;
  /** Quando cada rodada foi lida — usado pra calcular o tempo de cada contagem. */
  countedAt1?: string | null;
  countedAt2?: string | null;
  countedAt3?: string | null;
  status: InventoryCountItemStatus;
  addedDuringCount: boolean;
  /** Só referência — já está incluído em systemQuantity, não desconta dele. */
  reservedQuantity?: string | number;
  /** Custo médio (Inventory.averageCost) — usado pra calcular o valor contábil do ajuste. */
  unitCost?: string | number;

  product?: {
    id: string;
    code: string;
    description: string;
    barcode?: string | null;
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
  adjustedAt?: string | null;
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

export interface CountItemNotInCountError {
  code: "ITEM_NOT_IN_COUNT";
  message: string;
  product: { id: string; code: string; description: string };
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

  async count(
    id: string,
    payload: { code: string; quantity: number; confirmAdd?: boolean }
  ): Promise<InventoryCount> {
    const { data } = await api.patch<ApiEnvelope<InventoryCount>>(
      `/inventory-counts/${id}/count`,
      payload
    );

    return data.data;
  },

  async updateItemReadings(
    id: string,
    itemId: string,
    payload: {
      countedQuantity1?: number;
      countedQuantity2?: number;
      countedQuantity3?: number;
    }
  ): Promise<InventoryCount> {
    const { data } = await api.patch<ApiEnvelope<InventoryCount>>(
      `/inventory-counts/${id}/items/${itemId}`,
      payload
    );

    return data.data;
  },

  async finalize(
    id: string,
    payload: { confirmIncomplete?: boolean } = {}
  ): Promise<InventoryCount> {
    const { data } = await api.patch<ApiEnvelope<InventoryCount>>(
      `/inventory-counts/${id}/finalize`,
      payload
    );

    return data.data;
  },

  async adjust(id: string): Promise<InventoryCount> {
    const { data } = await api.patch<ApiEnvelope<InventoryCount>>(
      `/inventory-counts/${id}/adjust`
    );

    return data.data;
  },

  async cancel(id: string): Promise<InventoryCount> {
    const { data } = await api.patch<ApiEnvelope<InventoryCount>>(
      `/inventory-counts/${id}/cancel`
    );

    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/inventory-counts/${id}`);
  },
};
