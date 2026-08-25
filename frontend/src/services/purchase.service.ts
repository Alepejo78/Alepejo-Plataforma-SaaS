import { api } from "./api";
import type {
  FinancialDocumentType,
  PaymentMethod,
} from "./financial-entry.service";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type PurchaseStatus =
  | "DRAFT"
  | "APPROVED"
  | "RECEIVED"
  | "CANCELLED";

export const PURCHASE_STATUS_LABELS: Record<
  PurchaseStatus,
  string
> = {
  DRAFT: "Rascunho",
  APPROVED: "Aprovada",
  RECEIVED: "Recebida",
  CANCELLED: "Cancelada",
};

export interface PurchaseItem {
  id: string;
  productId: string;
  quantity: string | number;
  unitPrice: string | number;
  totalPrice: string | number;

  product?: {
    id: string;
    code: string;
    description: string;
    barcode?: string | null;
    unit?: { code: string } | null;
  } | null;
}

export interface PurchaseFinancialEntry {
  id: string;
  dueDate: string;
  amount: string | number;
  paidAmount: string | number;
  status: "OPEN" | "PAID" | "CANCELLED";
  documentNumber?: string | null;
  paymentDate?: string | null;
}

export interface Purchase {
  id: string;
  number: number;
  partnerId: string;
  warehouseId: string;
  status: PurchaseStatus;
  purchaseDate?: string | null;
  observation?: string | null;
  totalAmount: string | number;
  termDays?: number | null;
  installmentsCount?: number | null;
  dueDate?: string | null;
  paymentMethod?: PaymentMethod | null;
  /** Tipo de despesa — vai junto pro título gerado no recebimento. */
  chartOfAccountId?: string | null;
  chartOfAccount?: {
    id: string;
    code: string;
    description: string;
  } | null;
  invoiceNumber?: string | null;
  invoiceKey?: string | null;
  invoiceIssueDate?: string | null;
  purchaseOrderId?: string | null;
  createdAt: string;
  createdByName?: string | null;
  updatedByName?: string | null;
  items: PurchaseItem[];
  financialEntries: PurchaseFinancialEntry[];

  partner?: {
    id: string;
    legalName: string;
    tradeName?: string | null;
  } | null;

  warehouse?: {
    id: string;
    code: string;
    description: string;
  } | null;
}

export interface PurchaseItemPayload {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchasePayload {
  partnerId: string;
  warehouseId: string;
  purchaseDate?: string;
  observation?: string;
  termDays?: number;
  installmentsCount?: number;
  paymentMethod?: PaymentMethod;
  chartOfAccountId?: string;
  purchaseOrderId?: string;
  items: PurchaseItemPayload[];
}

export interface ReceivePurchasePayload {
  invoiceNumber?: string;
  invoiceKey?: string;
  invoiceIssueDate?: string;
  documentType?: FinancialDocumentType;
  termDays?: number;
  installmentsCount?: number;
  paymentMethod?: PaymentMethod;
}

export interface PurchaseFilter {
  partnerId?: string;
  warehouseId?: string;
  status?: PurchaseStatus;
  search?: string;
}

export function formatPurchaseNumber(
  n: number | string
) {
  return `C${String(n).padStart(9, "0")}`;
}

export const purchaseService = {
  async list(
    filter: PurchaseFilter = {}
  ): Promise<Purchase[]> {
    const { data } = await api.get<ApiEnvelope<Purchase[]>>(
      "/purchases",
      { params: filter }
    );

    return data.data ?? [];
  },

  async getById(id: string): Promise<Purchase> {
    const { data } = await api.get<ApiEnvelope<Purchase>>(
      `/purchases/${id}`
    );

    return data.data;
  },

  async create(payload: PurchasePayload): Promise<Purchase> {
    const { data } = await api.post<ApiEnvelope<Purchase>>(
      "/purchases",
      payload
    );

    return data.data;
  },

  async update(
    id: string,
    payload: Partial<PurchasePayload>
  ): Promise<Purchase> {
    const { data } = await api.patch<ApiEnvelope<Purchase>>(
      `/purchases/${id}`,
      payload
    );

    return data.data;
  },

  async approve(id: string): Promise<Purchase> {
    const { data } = await api.patch<ApiEnvelope<Purchase>>(
      `/purchases/${id}/approve`
    );

    return data.data;
  },

  async receive(
    id: string,
    payload: ReceivePurchasePayload = {}
  ): Promise<Purchase> {
    const { data } = await api.patch<ApiEnvelope<Purchase>>(
      `/purchases/${id}/receive`,
      payload
    );

    return data.data;
  },

  async unreceive(id: string): Promise<Purchase> {
    const { data } = await api.patch<ApiEnvelope<Purchase>>(
      `/purchases/${id}/unreceive`
    );

    return data.data;
  },

  async cancel(id: string): Promise<Purchase> {
    const { data } = await api.patch<ApiEnvelope<Purchase>>(
      `/purchases/${id}/cancel`
    );

    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/purchases/${id}`);
  },
};
