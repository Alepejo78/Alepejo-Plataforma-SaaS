import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

interface Paged<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Warehouse {
  id: string;
  code: string;
  description: string;
  active: boolean;
}

export interface InventoryItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: string | number;
  averageCost: string | number;
  active: boolean;

  product?: {
    id: string;
    code: string;
    description: string;
    minimumStock?: string | number | null;
    unit?: { code: string } | null;
  } | null;

  warehouse?: {
    id: string;
    code: string;
    description: string;
  } | null;
}

export type StockMovementType =
  | "ENTRY"
  | "EXIT"
  | "ADJUSTMENT"
  | "TRANSFER";

export const MOVEMENT_LABELS: Record<
  StockMovementType,
  string
> = {
  ENTRY: "Entrada",
  EXIT: "Saída",
  ADJUSTMENT: "Ajuste",
  TRANSFER: "Transferência",
};

export interface StockMovement {
  id: string;
  inventoryId: string;
  type: StockMovementType;
  quantity: string | number;
  unitCost?: string | number | null;
  observation?: string | null;
  createdAt: string;

  inventory?: {
    id: string;
    product?: {
      code: string;
      description: string;
    } | null;
    warehouse?: {
      code: string;
      description: string;
    } | null;
  } | null;
}

export const warehouseService = {
  async list(search?: string): Promise<Warehouse[]> {
    const { data } = await api.get<
      ApiEnvelope<Warehouse[] | Paged<Warehouse>>
    >("/warehouses", { params: { search } });

    const payload = data.data;

    // O endpoint devolve lista simples; tratamos os dois formatos
    // para não quebrar caso a paginação seja adicionada depois.
    return Array.isArray(payload)
      ? payload
      : (payload?.data ?? []);
  },

  async create(payload: Record<string, unknown>) {
    const { data } = await api.post<
      ApiEnvelope<Warehouse>
    >("/warehouses", payload);

    return data.data;
  },

  async update(
    id: string,
    payload: Record<string, unknown>
  ) {
    const { data } = await api.patch<
      ApiEnvelope<Warehouse>
    >(`/warehouses/${id}`, payload);

    return data.data;
  },

  async remove(id: string) {
    await api.delete(`/warehouses/${id}`);
  },
};

export const inventoryService = {
  async list(filter: {
    search?: string;
    warehouseId?: string;
    productId?: string;
    limit?: number;
  } = {}): Promise<Paged<InventoryItem>> {
    const { data } = await api.get<
      ApiEnvelope<Paged<InventoryItem>>
    >("/inventory", {
      params: { limit: 100, ...filter },
    });

    return data.data;
  },

  async create(payload: Record<string, unknown>) {
    const { data } = await api.post<
      ApiEnvelope<InventoryItem>
    >("/inventory", payload);

    return data.data;
  },

  async remove(id: string) {
    await api.delete(`/inventory/${id}`);
  },
};

export const stockMovementService = {
  async list(filter: {
    inventoryId?: string;
    type?: StockMovementType;
    search?: string;
  } = {}): Promise<StockMovement[]> {
    const { data } = await api.get<
      ApiEnvelope<StockMovement[] | Paged<StockMovement>>
    >("/stock-movements", { params: filter });

    const payload = data.data;

    return Array.isArray(payload)
      ? payload
      : (payload?.data ?? []);
  },

  async create(payload: Record<string, unknown>) {
    const { data } = await api.post<
      ApiEnvelope<StockMovement>
    >("/stock-movements", payload);

    return data.data;
  },
};
