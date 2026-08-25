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

export type ProductType = "PRODUCT" | "SERVICE";
export type ProductStatus = "ACTIVE" | "INACTIVE";
export type InventoryControl =
  | "NONE"
  | "SIMPLE"
  | "BATCH"
  | "SERIAL";

export const PRODUCT_TYPE_LABELS: Record<
  ProductType,
  string
> = {
  PRODUCT: "Produto",
  SERVICE: "Serviço",
};

export const INVENTORY_CONTROL_LABELS: Record<
  InventoryControl,
  string
> = {
  NONE: "Nenhum — não movimenta estoque (serviço/despesa)",
  SIMPLE: "Simples",
  BATCH: "Por lote",
  SERIAL: "Por número de série",
};

export interface AuxiliaryRecord {
  id: string;
  name: string;
  description?: string | null;
  active: boolean;
  [key: string]: unknown;
}

export interface UnitOfMeasure {
  id: string;
  code: string;
  description: string;
  active: boolean;
  [key: string]: unknown;
}

export interface Product {
  id: string;
  code: string;
  barcode?: string | null;
  reference?: string | null;
  description: string;
  complementaryDescription?: string | null;
  type: ProductType;
  inventoryControl: InventoryControl;
  categoryId?: string | null;
  brandId?: string | null;
  chartOfAccountId?: string | null;
  unitId: string;
  cost: string | number;
  salePrice: string | number;
  minimumStock?: string | number | null;
  currentStock?: string | number | null;
  weightKg?: string | number | null;
  cubageM3?: string | number | null;
  status: ProductStatus;
  active: boolean;
  createdAt?: string;
  createdByName?: string | null;
  updatedByName?: string | null;

  category?: AuxiliaryRecord | null;
  brand?: AuxiliaryRecord | null;
  unit?: UnitOfMeasure | null;
  chartOfAccount?: {
    id: string;
    code: string;
    description: string;
  } | null;
}

export interface ProductFilter {
  search?: string;
  barcode?: string;
  categoryId?: string;
  brandId?: string;
  type?: ProductType;
  status?: ProductStatus;
  page?: number;
  limit?: number;
}

export const productService = {
  async list(
    filter: ProductFilter = {}
  ): Promise<Paged<Product>> {
    const { data } = await api.get<
      ApiEnvelope<Paged<Product>>
    >("/products", { params: filter });

    return data.data;
  },

  async create(payload: Record<string, unknown>) {
    const { data } = await api.post<ApiEnvelope<Product>>(
      "/products",
      payload
    );

    return data.data;
  },

  async update(
    id: string,
    payload: Record<string, unknown>
  ) {
    const { data } = await api.patch<ApiEnvelope<Product>>(
      `/products/${id}`,
      payload
    );

    return data.data;
  },

  async remove(id: string) {
    await api.delete(`/products/${id}`);
  },
};

/**
 * Categorias, marcas e unidades têm o mesmo formato de API.
 * Uma fábrica evita repetir três services praticamente iguais.
 */
function createAuxiliaryService<T>(resource: string) {
  return {
    async list(search?: string): Promise<Paged<T>> {
      const { data } = await api.get<ApiEnvelope<Paged<T>>>(
        `/${resource}`,
        { params: { search, limit: 100 } }
      );

      return data.data;
    },

    async create(payload: Record<string, unknown>) {
      const { data } = await api.post<ApiEnvelope<T>>(
        `/${resource}`,
        payload
      );

      return data.data;
    },

    async update(
      id: string,
      payload: Record<string, unknown>
    ) {
      const { data } = await api.patch<ApiEnvelope<T>>(
        `/${resource}/${id}`,
        payload
      );

      return data.data;
    },

    async remove(id: string) {
      await api.delete(`/${resource}/${id}`);
    },
  };
}

export const categoryService =
  createAuxiliaryService<AuxiliaryRecord>(
    "product-categories"
  );

export const brandService =
  createAuxiliaryService<AuxiliaryRecord>("brands");

export const unitService =
  createAuxiliaryService<UnitOfMeasure>("units-of-measure");
