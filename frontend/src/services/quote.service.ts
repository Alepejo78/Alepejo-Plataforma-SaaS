import { api } from "./api";
import type { PaymentMethod } from "./financial-entry.service";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type QuoteStatus =
  | "DRAFT"
  | "SENT"
  | "REVISION_REQUESTED"
  | "APPROVED"
  | "CONVERTED"
  | "CANCELLED";

export const QUOTE_STATUS_LABELS: Record<
  QuoteStatus,
  string
> = {
  DRAFT: "Rascunho",
  SENT: "Aguardando cliente",
  REVISION_REQUESTED: "Revisão solicitada",
  APPROVED: "Aprovado",
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
    saleChartOfAccountId?: string | null;
    saleChartOfAccount?: {
      code: string;
      description: string;
    } | null;
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
  termDays?: number | null;
  paymentMethod?: PaymentMethod | null;
  installmentsCount?: number | null;
  /** Parcelas planejadas no orçamento (data/valor escolhidos na mão) — repassadas pro Pedido de Venda e pra Venda gerados na aprovação. */
  plannedInstallments?: { dueDate: string; amount: number }[] | null;
  /** Tipo de receita — repassado pro Pedido de Venda e pra Venda na aprovação. */
  chartOfAccountId?: string | null;
  chartOfAccount?: {
    id: string;
    code: string;
    description: string;
  } | null;
  /** Juros de parcelamento aprovado pelo cliente — já somado em otherExpenses/netAmount. */
  installmentInterestAmount?: string | number;

  /** Aprovação digital pelo cliente (link público). */
  confirmationSentAt?: string | null;
  customerApprovedAt?: string | null;
  customerRevisionNote?: string | null;
  customerRevisionAt?: string | null;
  customerCancelReason?: string | null;
  customerCancelledAt?: string | null;

  createdAt: string;
  createdByName?: string | null;
  updatedByName?: string | null;
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

  /** Pedido de Venda gerado automaticamente na aprovação (ver /quotes/:id/approve). */
  salesOrder?: {
    id: string;
    number: number;
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
  chartOfAccountId?: string;
  termDays?: number;
  paymentMethod?: PaymentMethod;
  installmentsCount?: number;
  /** Parcelas planejadas no orçamento — tem prioridade sobre installmentsCount. */
  installments?: { dueDate: string; amount: number }[];
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

  async remove(id: string): Promise<void> {
    await api.delete(`/quotes/${id}`);
  },

  async approve(id: string): Promise<Quote> {
    const { data } = await api.patch<ApiEnvelope<Quote>>(
      `/quotes/${id}/approve`
    );

    return data.data;
  },

  /** Envia (ou reenvia) o link de aprovação digital ao cliente. */
  async sendConfirmation(
    id: string
  ): Promise<{ sent: boolean; channels: string[] }> {
    const { data } = await api.post<
      ApiEnvelope<{ sent: boolean; channels: string[] }>
    >(`/quotes/${id}/send-confirmation`);

    return data.data;
  },

  async undoApproval(id: string): Promise<Quote> {
    const { data } = await api.patch<ApiEnvelope<Quote>>(
      `/quotes/${id}/undo-approval`
    );

    return data.data;
  },
};
