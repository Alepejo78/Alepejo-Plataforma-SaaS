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

export type BillingCycle = "MONTHLY" | "YEARLY";

export interface CreateCheckoutPayload {
  planId: string;
  billingCycle: BillingCycle;
  billingType: BillingType;
  document: string;
  name: string;
  email: string;
  phone?: string;
  moduleIds?: string[];
}

/** Compra iniciada antes do cadastro — mesmo resultado do subscribe, mais o id do checkout. */
export interface CheckoutResult extends SubscribeResult {
  checkoutId: string;
}

export interface PendingCheckout {
  id: string;
  planId: string;
  planName: string;
  planCode: string;
  billingCycle: BillingCycle;
  value: number;
  document: string;
  name: string;
  email: string;
  phone?: string | null;
  paid: boolean;
}

export type ChargeStatus =
  | "PENDING"
  | "CONFIRMED"
  | "RECEIVED"
  | "OVERDUE"
  | "REFUNDED"
  | "CANCELLED";

export type ChargeType = "SUBSCRIPTION" | "SETUP_FEE" | "ADDON";

/** Uma fatura da assinatura — o que a tela de Cobranças lista. */
export interface BillingChargeRow {
  id: string;
  type: ChargeType;
  billingType: string | null;
  value: string | number;
  dueDate: string;
  status: ChargeStatus;
  paidAt: string | null;
  /** Página de pagamento no Asaas: PIX, boleto e cartão no mesmo lugar. */
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
}

export const billingService = {
  async subscribe(billingType: BillingType): Promise<SubscribeResult> {
    const { data } = await api.post<ApiEnvelope<SubscribeResult>>(
      "/billing/me/subscribe",
      { billingType }
    );

    return data.data;
  },

  /** Faturas da assinatura da própria empresa. */
  async listCharges(): Promise<BillingChargeRow[]> {
    const { data } = await api.get<ApiEnvelope<BillingChargeRow[]>>(
      "/billing/me/charges"
    );

    return data.data ?? [];
  },

  /** Pública (sem sessão) — "Comprar agora" de /planos, antes do cadastro existir. */
  async createCheckout(
    payload: CreateCheckoutPayload
  ): Promise<CheckoutResult> {
    const { data } = await api.post<ApiEnvelope<CheckoutResult>>(
      "/billing/checkout",
      payload
    );

    return data.data;
  },

  /** Pública (sem sessão) — dados da compra, pra tela de cadastro preencher. */
  async getCheckout(id: string): Promise<PendingCheckout> {
    const { data } = await api.get<ApiEnvelope<PendingCheckout>>(
      `/billing/checkout/${encodeURIComponent(id)}`
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
