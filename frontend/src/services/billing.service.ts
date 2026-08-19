import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type BillingType = "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED";

export interface SubscribeResult {
  billingType: BillingType;
  value: number;
  dueDate: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixPayload?: string;
  pixQrCodeImage?: string;
}

export type MonthStatus = "PAGO" | "A_PAGAR" | "VENCIDO" | "VAZIO";

export interface MonthCell {
  month: number;
  value: number;
  status: MonthStatus;
}

export interface CustomerReportRow {
  companyId: string;
  legalName: string;
  tradeName: string | null;
  email: string | null;
  phone: string | null;
  document: string;
  planCode: string | null;
  planName: string | null;
  billingCycle: "MONTHLY" | "YEARLY" | null;
  modules: string[];
  months: MonthCell[];
  total: number;
}

export const billingService = {
  async subscribe(billingType: BillingType): Promise<SubscribeResult> {
    const { data } = await api.post<ApiEnvelope<SubscribeResult>>(
      "/billing/me/subscribe",
      { billingType }
    );

    return data.data;
  },

  /** Só plataforma (`platform.license.manage`) — relatório de clientes/faturamento. */
  async customerReport(year: number): Promise<CustomerReportRow[]> {
    const { data } = await api.get<ApiEnvelope<CustomerReportRow[]>>(
      "/billing/customers",
      { params: { year } }
    );

    return data.data ?? [];
  },
};
