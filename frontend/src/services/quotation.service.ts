import { api } from "./api";
import type { PaymentMethod } from "./financial-entry.service";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type QuotationStatus = "DRAFT" | "DECIDED" | "CANCELLED";

export const QUOTATION_STATUS_LABELS: Record<
  QuotationStatus,
  string
> = {
  DRAFT: "Em aberto",
  DECIDED: "Decidida",
  CANCELLED: "Cancelada",
};

export interface QuotationItem {
  id: string;
  productId: string;
  quantity: string | number;

  product?: {
    id: string;
    code: string;
    description: string;
    unit?: { code: string } | null;
  } | null;
}

export interface QuotationOfferItem {
  id: string;
  productId: string;
  unitPrice: string | number;
  totalPrice: string | number;

  product?: {
    id: string;
    code: string;
    description: string;
    unit?: { code: string } | null;
  } | null;
}

export interface QuotationOffer {
  id: string;
  quotationId: string;
  partnerId: string;
  isWinner: boolean;
  termDays?: number | null;
  paymentMethod?: PaymentMethod | null;
  installmentsCount?: number | null;
  totalAmount: string | number;
  createdAt: string;
  items: QuotationOfferItem[];

  partner?: {
    id: string;
    legalName: string;
    tradeName?: string | null;
  } | null;

  purchaseOrder?: { id: string; number: number } | null;
}

export interface Quotation {
  id: string;
  number: number;
  warehouseId: string;
  status: QuotationStatus;
  quotationDate?: string | null;
  observation?: string | null;
  createdAt: string;
  createdByName?: string | null;
  updatedByName?: string | null;
  items: QuotationItem[];
  offers: QuotationOffer[];

  warehouse?: {
    id: string;
    code: string;
    description: string;
  } | null;
}

export interface QuotationItemPayload {
  productId: string;
  quantity: number;
}

export interface QuotationPayload {
  warehouseId: string;
  quotationDate?: string;
  observation?: string;
  items: QuotationItemPayload[];
}

export interface QuotationOfferItemPayload {
  productId: string;
  unitPrice: number;
}

export interface QuotationOfferPayload {
  partnerId: string;
  termDays?: number;
  paymentMethod?: PaymentMethod;
  installmentsCount?: number;
  items: QuotationOfferItemPayload[];
}

export interface QuotationFilter {
  warehouseId?: string;
  status?: QuotationStatus;
}

export const quotationService = {
  async list(
    filter: QuotationFilter = {}
  ): Promise<Quotation[]> {
    const { data } = await api.get<ApiEnvelope<Quotation[]>>(
      "/quotations",
      { params: filter }
    );

    return data.data ?? [];
  },

  async getById(id: string): Promise<Quotation> {
    const { data } = await api.get<ApiEnvelope<Quotation>>(
      `/quotations/${id}`
    );

    return data.data;
  },

  async create(
    payload: QuotationPayload
  ): Promise<Quotation> {
    const { data } = await api.post<ApiEnvelope<Quotation>>(
      "/quotations",
      payload
    );

    return data.data;
  },

  async update(
    id: string,
    payload: Partial<QuotationPayload>
  ): Promise<Quotation> {
    const { data } = await api.patch<ApiEnvelope<Quotation>>(
      `/quotations/${id}`,
      payload
    );

    return data.data;
  },

  async cancel(id: string): Promise<Quotation> {
    const { data } = await api.patch<ApiEnvelope<Quotation>>(
      `/quotations/${id}/cancel`
    );

    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/quotations/${id}`);
  },

  async addOffer(
    quotationId: string,
    payload: QuotationOfferPayload
  ): Promise<QuotationOffer> {
    const { data } = await api.post<
      ApiEnvelope<QuotationOffer>
    >(`/quotations/${quotationId}/offers`, payload);

    return data.data;
  },

  async removeOffer(
    quotationId: string,
    offerId: string
  ): Promise<void> {
    await api.delete(
      `/quotations/${quotationId}/offers/${offerId}`
    );
  },

  async chooseWinner(
    quotationId: string,
    offerId: string
  ): Promise<Quotation> {
    const { data } = await api.patch<ApiEnvelope<Quotation>>(
      `/quotations/${quotationId}/offers/${offerId}/choose`
    );

    return data.data;
  },

  async undoWinner(quotationId: string): Promise<Quotation> {
    const { data } = await api.patch<ApiEnvelope<Quotation>>(
      `/quotations/${quotationId}/undo-winner`
    );

    return data.data;
  },
};
