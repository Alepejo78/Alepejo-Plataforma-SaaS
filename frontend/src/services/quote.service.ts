import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type QuoteStatus = "DRAFT" | "CONVERTED" | "CANCELLED";

export const QUOTE_STATUS_LABELS: Record<
  QuoteStatus,
  string
> = {
  DRAFT: "Rascunho",
  CONVERTED: "Convertido em venda",
  CANCELLED: "Cancelado",
};

export interface QuoteItem {
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

export interface Quote {
  id: string;
  number: number;
  partnerId: string;
  warehouseId: string;
  status: QuoteStatus;
  quoteDate?: string | null;
  validUntil?: string | null;
  observation?: string | null;
  discountValue: string | number;
  freightValue: string | number;
  otherExpenses: string | number;
  totalAmount: string | number;
  netAmount: string | number;
  createdAt: string;
  items: QuoteItem[];

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

export interface QuoteItemPayload {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface QuotePayload {
  partnerId: string;
  warehouseId: string;
  quoteDate?: string;
  validUntil?: string;
  observation?: string;
  discountValue?: number;
  freightValue?: number;
  otherExpenses?: number;
  items: QuoteItemPayload[];
}

export interface QuoteFilter {
  partnerId?: string;
  warehouseId?: string;
  status?: QuoteStatus;
}

export const quoteService = {
  async list(filter: QuoteFilter = {}): Promise<Quote[]> {
    const { data } = await api.get<ApiEnvelope<Quote[]>>(
      "/quotes",
      { params: filter }
    );

    return data.data ?? [];
  },

  async getById(id: string): Promise<Quote> {
    const { data } = await api.get<ApiEnvelope<Quote>>(
      `/quotes/${id}`
    );

    return data.data;
  },

  async create(payload: QuotePayload): Promise<Quote> {
    const { data } = await api.post<ApiEnvelope<Quote>>(
      "/quotes",
      payload
    );

    return data.data;
  },

  async update(
    id: string,
    payload: Partial<QuotePayload>
  ): Promise<Quote> {
    const { data } = await api.patch<ApiEnvelope<Quote>>(
      `/quotes/${id}`,
      payload
    );

    return data.data;
  },

  async cancel(id: string): Promise<Quote> {
    const { data } = await api.patch<ApiEnvelope<Quote>>(
      `/quotes/${id}/cancel`
    );

    return data.data;
  },
};
