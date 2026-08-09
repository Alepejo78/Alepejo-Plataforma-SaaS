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
  [key: string]: unknown;
}

export interface InventoryItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: string | number;
  averageCost: string | number;
  blockedQuantity: string | number;
  reservedQuantity: string | number;
  quarantineQuantity: string | number;
  damagedQuantity: string | number;
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

  holds?: StockHold[];
}

export type StockMovementType =
  | "ENTRY"
  | "EXIT"
  | "ADJUSTMENT"
  | "TRANSFER"
  | "HOLD"
  | "RELEASE";

export const MOVEMENT_LABELS: Record<
  StockMovementType,
  string
> = {
  ENTRY: "Entrada",
  EXIT: "Saída",
  ADJUSTMENT: "Ajuste",
  TRANSFER: "Transferência",
  HOLD: "Bloqueio/Retenção",
  RELEASE: "Liberação",
};

export interface StockMovement {
  id: string;
  inventoryId: string;
  type: StockMovementType;
  quantity: string | number;
  unitCost?: string | number | null;
  observation?: string | null;
  documentNumber?: string | null;
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

export type StockHoldType =
  | "BLOCKED"
  | "RESERVED"
  | "QUARANTINE"
  | "DAMAGED";

export type StockHoldStatus = "ACTIVE" | "RELEASED";

export const STOCK_HOLD_TYPE_LABELS: Record<
  StockHoldType,
  string
> = {
  BLOCKED: "Bloqueado",
  RESERVED: "Reservado",
  QUARANTINE: "Quarentena",
  DAMAGED: "Avariado",
};

export interface StockHold {
  id: string;
  inventoryId: string;
  type: StockHoldType;
  status: StockHoldStatus;
  quantity: string | number;
  reason?: string | null;
  releasedAt?: string | null;
  createdAt: string;

  inventory?: {
    id: string;
    product?: { code: string; description: string } | null;
    warehouse?: { code: string; description: string } | null;
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

export const stockHoldService = {
  async list(filter: {
    inventoryId?: string;
    type?: StockHoldType;
    status?: StockHoldStatus;
  } = {}): Promise<StockHold[]> {
    const { data } = await api.get<
      ApiEnvelope<StockHold[]>
    >("/stock-holds", { params: filter });

    return data.data ?? [];
  },

  async create(payload: {
    inventoryId: string;
    type: StockHoldType;
    quantity: number;
    reason?: string;
  }): Promise<StockHold> {
    const { data } = await api.post<
      ApiEnvelope<StockHold>
    >("/stock-holds", payload);

    return data.data;
  },

  async release(id: string): Promise<StockHold> {
    const { data } = await api.patch<
      ApiEnvelope<StockHold>
    >(`/stock-holds/${id}/release`);

    return data.data;
  },
};
