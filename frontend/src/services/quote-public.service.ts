import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type QuotePaymentTiming = "A_VISTA" | "A_PRAZO";

export interface QuotePublicItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface QuotePublicSalesSettings {
  maxInstallments: number;
  interestFreeInstallments: number;
  interestRatePerInstallment: number;
}

export interface QuotePublicInfo {
  quoteNumber: string;
  companyName: string;
  companyLogo?: string | null;
  partnerName: string;
  validUntil?: string | null;
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
  salesSettings: QuotePublicSalesSettings;
}

/**
 * Juros por parcela acima do limite sem juros — mesma fórmula de
 * `Backend/src/core/utils/installment.util.ts#applyInstallmentInterest`,
 * usada aqui só pra mostrar o total em tempo real; o valor final é
 * sempre recalculado (autoritativo) no backend ao confirmar.
 */
export function previewInstallmentInterest(
  netAmount: number,
  installmentsCount: number,
  settings: QuotePublicSalesSettings
): number {
  const chargeable = Math.max(
    0,
    installmentsCount - settings.interestFreeInstallments
  );

  if (chargeable === 0 || settings.interestRatePerInstallment <= 0) {
    return 0;
  }

  return (
    Math.round(
      netAmount *
        (settings.interestRatePerInstallment / 100) *
        chargeable *
        100
    ) / 100
  );
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
      paymentTiming: QuotePaymentTiming;
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
