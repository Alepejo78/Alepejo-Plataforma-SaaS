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

export type SaleStatus =
  | "DRAFT"
  | "APPROVED"
  | "INVOICED"
  | "SHIPPED"
  | "CANCELLED";

export const SALE_STATUS_LABELS: Record<
  SaleStatus,
  string
> = {
  DRAFT: "Rascunho",
  APPROVED: "Aprovada",
  INVOICED: "Faturada",
  SHIPPED: "Expedida",
  CANCELLED: "Cancelada",
};

export interface SaleItem {
  id: string;
  productId: string;
  quantity: string | number;
  unitPrice: string | number;
  totalPrice: string | number;

  product?: {
    id: string;
    code: string;
    description: string;
    unit?: { code: string } | null;
  } | null;
}

export interface Sale {
  id: string;
  number: number;
  partnerId: string;
  warehouseId: string;
  status: SaleStatus;
  saleDate?: string | null;
  invoiceNumber?: string | null;
  invoiceKey?: string | null;
  invoiceIssueDate?: string | null;
  observation?: string | null;
  discountValue: string | number;
  freightValue: string | number;
  otherExpenses: string | number;
  totalAmount: string | number;
  netAmount: string | number;
  termDays?: number | null;
  dueDate?: string | null;
  paymentMethod?: PaymentMethod | null;
  /** Tipo de receita — vai junto pro título gerado na aprovação. */
  chartOfAccountId?: string | null;
  chartOfAccount?: {
    id: string;
    code: string;
    description: string;
  } | null;
  quoteId?: string | null;
  salesOrderId?: string | null;
  createdAt: string;
  items: SaleItem[];

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

export interface SaleItemPayload {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface SalePayload {
  partnerId: string;
  warehouseId: string;
  saleDate?: string;
  observation?: string;
  discountValue?: number;
  freightValue?: number;
  otherExpenses?: number;
  termDays?: number;
  paymentMethod?: PaymentMethod;
  chartOfAccountId?: string;
  quoteId?: string;
  salesOrderId?: string;
  items: SaleItemPayload[];
}

export interface ApproveSalePayload {
  invoiceNumber?: string;
  invoiceKey?: string;
  invoiceIssueDate?: string;
  documentType?: FinancialDocumentType;
  termDays?: number;
  paymentMethod?: PaymentMethod;
}

export interface SaleFilter {
  partnerId?: string;
  warehouseId?: string;
  status?: SaleStatus;
  search?: string;
}

export function formatSaleNumber(n: number | string) {
  return `V${String(n).padStart(9, "0")}`;
}

export const saleService = {
  async list(filter: SaleFilter = {}): Promise<Sale[]> {
    const { data } = await api.get<ApiEnvelope<Sale[]>>(
      "/sales",
      { params: filter }
    );

    return data.data ?? [];
  },

  async getById(id: string): Promise<Sale> {
    const { data } = await api.get<ApiEnvelope<Sale>>(
      `/sales/${id}`
    );

    return data.data;
  },

  async create(payload: SalePayload): Promise<Sale> {
    const { data } = await api.post<ApiEnvelope<Sale>>(
      "/sales",
      payload
    );

    return data.data;
  },

  async update(
    id: string,
    payload: Partial<SalePayload>
  ): Promise<Sale> {
    const { data } = await api.patch<ApiEnvelope<Sale>>(
      `/sales/${id}`,
      payload
    );

    return data.data;
  },

  async approve(
    id: string,
    payload: ApproveSalePayload = {}
  ): Promise<Sale> {
    const { data } = await api.patch<ApiEnvelope<Sale>>(
      `/sales/${id}/approve`,
      payload
    );

    return data.data;
  },

  /** Cancela uma venda em rascunho (ainda não aprovada). */
  async cancel(id: string): Promise<Sale> {
    const { data } = await api.patch<ApiEnvelope<Sale>>(
      `/sales/${id}/cancel`
    );

    return data.data;
  },

  /** Desfaz a aprovação: volta a venda para rascunho e devolve o estoque. */
  async undoApproval(id: string): Promise<Sale> {
    const { data } = await api.patch<ApiEnvelope<Sale>>(
      `/sales/${id}/undo-approval`
    );

    return data.data;
  },
};
