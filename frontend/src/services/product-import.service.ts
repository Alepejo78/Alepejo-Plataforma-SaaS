import { api } from "./api";
import type { InventoryControl, ProductStatus } from "./product.service";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export interface ProductImportRowData {
  code: string;
  description?: string;
  type?: "PRODUCT" | "SERVICE";
  inventoryControl?: InventoryControl;
  unitId?: string;
  salePrice?: number;
  barcode?: string;
  reference?: string;
  complementaryDescription?: string;
  categoryName?: string;
  brandName?: string;
  chartOfAccountId?: string;
  saleChartOfAccountId?: string;
  minimumStock?: number;
  weightKg?: number;
  cubageM3?: number;
  minProductionBatch?: number;
  status?: ProductStatus;
  existingId?: string;
}

export interface ImportPreviewRow<T> {
  line: number;
  action: "create" | "update" | "error";
  errors: string[];
  data: T;
}

export interface ImportPreview<T> {
  toCreate: number;
  toUpdate: number;
  toError: number;
  rows: ImportPreviewRow<T>[];
}

export const productImportService = {
  async parse(file: File): Promise<ImportPreview<ProductImportRowData>> {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await api.post<
      ApiEnvelope<ImportPreview<ProductImportRowData>>
    >("/product-import/parse", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return data.data;
  },

  async confirm(
    rows: (ProductImportRowData & { action: "create" | "update" })[]
  ): Promise<{ created: number; updated: number }> {
    const { data } = await api.post<
      ApiEnvelope<{ created: number; updated: number }>
    >("/product-import/confirm", { rows });

    return data.data;
  },
};
