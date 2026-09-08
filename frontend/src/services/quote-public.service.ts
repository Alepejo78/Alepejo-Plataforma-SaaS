import { api } from "./api";
import type { PaymentMethod } from "./financial-entry.service";
import type { PaymentMethodSettings } from "./payment-method-settings.service";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

/** Formas de pagamento que o cliente pode escolher no link público. */
export const PUBLIC_QUOTE_PAYMENT_METHODS: PaymentMethod[] = [
  "PIX",
  "BOLETO",
  "DEBITO",
  "CREDITO",
];

export interface QuotePublicItem {
  description: string;
  detail?: string | null;
  itemKind: "PRODUCT" | "SERVICE";
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/** Só os números do acréscimo por forma de pagamento — sem credenciais. */
export type QuotePublicPaymentSettings = Pick<
  PaymentMethodSettings,
  | "boletoSurchargeType"
  | "boletoSurchargeValue"
  | "pixSurchargeType"
  | "pixSurchargeValue"
  | "cardSurchargeType"
  | "cardSurchargeValue"
  | "cardMaxInstallments"
  | "cardInterestFreeInstallments"
  | "cardInterestRatePerInstallment"
>;

export interface QuotePublicInfo {
  quoteNumber: string;
  companyName: string;
  companyLogo?: string | null;
  partnerName: string;
  validUntil?: string | null;
  purpose: "SALE" | "SERVICE";
  serviceDescription?: string | null;
  items: QuotePublicItem[];
  netAmount: number;
  status:
    | "DRAFT"
    | "SENT"
    | "REVISION_REQUESTED"
    | "APPROVED"
    | "CONVERTED"
    | "CANCELLED";
  customerRevisionNote?: string | null;
  customerCancelReason?: string | null;
  /** O que já ficou decidido — presente mesmo depois de aprovado, pra reabrir o link e conferir. */
  paymentMethod: PaymentMethod | null;
  installmentsCount: number | null;
  plannedInstallments: { dueDate: string; amount: number }[] | null;
  maxInstallments: number;
  paymentSettings: QuotePublicPaymentSettings;
}

export const quotePublicService = {
  async getInfo(id: string, token: string): Promise<QuotePublicInfo> {
    const { data } = await api.get<ApiEnvelope<QuotePublicInfo>>(
      `/quotes/public/${id}`,
      { params: { token } }
    );

    return data.data;
  },

  async approve(
    id: string,
    token: string,
    payload: {
      paymentMethod: PaymentMethod;
      installmentsCount?: number;
    }
  ): Promise<{ success: boolean }> {
    const { data } = await api.post<ApiEnvelope<{ success: boolean }>>(
      `/quotes/public/${id}/approve`,
      payload,
      { params: { token } }
    );

    return data.data;
  },

  async requestRevision(
    id: string,
    token: string,
    message: string
  ): Promise<{ success: boolean }> {
    const { data } = await api.post<ApiEnvelope<{ success: boolean }>>(
      `/quotes/public/${id}/request-revision`,
      { message },
      { params: { token } }
    );

    return data.data;
  },

  async cancel(
    id: string,
    token: string,
    reason: string
  ): Promise<{ success: boolean }> {
    const { data } = await api.post<ApiEnvelope<{ success: boolean }>>(
      `/quotes/public/${id}/cancel`,
      { reason },
      { params: { token } }
    );

    return data.data;
  },
};
