import { api } from "./api";
import type {
  FinancialDocumentType,
  FinancialEntryType,
  PaymentMethod,
} from "./financial-entry.service";
import type { ImportPreview } from "./product-import.service";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export interface FinancialEntryImportRowData {
  type?: FinancialEntryType;
  partnerId?: string;
  productId?: string;
  chartOfAccountId?: string;
  documentNumber?: string;
  issueDate?: string;
  dueDate?: string;
  amount?: number;
  paymentMethod?: PaymentMethod;
  documentType?: FinancialDocumentType;
  documentKey?: string;
  observation?: string;
  existingId?: string;
}

export const financialEntryImportService = {
  async parse(
    file: File
  ): Promise<ImportPreview<FinancialEntryImportRowData>> {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await api.post<
      ApiEnvelope<ImportPreview<FinancialEntryImportRowData>>
    >("/financial-entry-import/parse", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return data.data;
  },

  async confirm(
    rows: (FinancialEntryImportRowData & { action: "create" | "update" })[]
  ): Promise<{ created: number; updated: number }> {
    const { data } = await api.post<
      ApiEnvelope<{ created: number; updated: number }>
    >("/financial-entry-import/confirm", { rows });

    return data.data;
  },
};
