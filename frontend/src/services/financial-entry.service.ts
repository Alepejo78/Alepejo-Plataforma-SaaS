import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

interface Paged<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  totals?: {
    status: FinancialEntryStatus;
    _sum: {
      amount: string | number | null;
      paidAmount: string | number | null;
    };
  }[];
}

export type FinancialEntryType = "RECEIVABLE" | "PAYABLE";
export type FinancialEntryStatus =
  | "OPEN"
  | "PAID"
  | "CANCELLED";

export type FinancialDocumentType =
  | "BOLETO"
  | "CARNE"
  | "CUPOM_FISCAL"
  | "NOTA_FISCAL"
  | "RECIBO"
  | "OUTRO";

export type PaymentMethod =
  | "DINHEIRO"
  | "PIX"
  | "BOLETO"
  | "TRANSFERENCIA"
  | "DEPOSITO"
  | "DEBITO"
  | "CREDITO"
  | "CHEQUE"
  | "DESCONTO_NF"
  | "OUTRO";

export const FINANCIAL_ENTRY_STATUS_LABELS: Record<
  FinancialEntryStatus,
  string
> = {
  OPEN: "Em aberto",
  PAID: "Baixado",
  CANCELLED: "Cancelado",
};

export const DOCUMENT_TYPE_LABELS: Record<
  FinancialDocumentType,
  string
> = {
  BOLETO: "Boleto",
  CARNE: "Carnê",
  CUPOM_FISCAL: "Cupom Fiscal",
  NOTA_FISCAL: "Nota Fiscal",
  RECIBO: "Recibo",
  OUTRO: "Outro",
};

export const PAYMENT_METHOD_LABELS: Record<
  PaymentMethod,
  string
> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  BOLETO: "Boleto",
  TRANSFERENCIA: "Transferência",
  DEPOSITO: "Depósito",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  CHEQUE: "Cheque",
  DESCONTO_NF: "Desconto NF",
  OUTRO: "Outro",
};

export interface FinancialEntry {
  id: string;
  type: FinancialEntryType;
  status: FinancialEntryStatus;
  /** Um dos dois — parceiro (compra/venda) ou colaborador (folha). */
  partnerId?: string | null;
  partner?: {
    id: string;
    legalName: string;
    tradeName?: string | null;
    document: string;
  } | null;
  employeeId?: string | null;
  employee?: {
    id: string;
    name: string;
  } | null;
  chartOfAccountId?: string | null;
  chartOfAccount?: {
    id: string;
    code: string;
    description: string;
    classification?: { id: string; name: string } | null;
  } | null;
  issueDate: string;
  termDays?: number | null;
  dueDate: string;
  documentNumber?: string | null;
  documentType?: FinancialDocumentType | null;
  documentKey?: string | null;
  amount: string | number;
  paidAmount: string | number;
  paymentDate?: string | null;
  paymentMethod?: PaymentMethod | null;
  observation?: string | null;
  purchaseId?: string | null;
  saleId?: string | null;
  payrollItemId?: string | null;
  createdAt: string;
  createdByName?: string | null;
  updatedByName?: string | null;
}

export interface FinancialEntryPayload {
  type: FinancialEntryType;
  partnerId: string;
  chartOfAccountId?: string;
  issueDate: string;
  termDays?: number;
  dueDate: string;
  documentNumber?: string;
  documentType?: FinancialDocumentType;
  documentKey?: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  observation?: string;
}

export interface FinancialEntryFilter {
  type?: FinancialEntryType;
  status?: FinancialEntryStatus;
  partnerId?: string;
  search?: string;
  dueFrom?: string;
  dueTo?: string;
  overdue?: boolean;
  page?: number;
  limit?: number;
}

export interface SettlePayload {
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  paidAmount?: number;
  observation?: string;
}

export interface CashFlowBucket {
  total: number;
  settled: number;
  open: number;
  overdue: number;
}

export interface CashFlowMonth {
  month: number;
  receivable: CashFlowBucket;
  payable: CashFlowBucket;
  balance: number;
  cumulativeBalance: number;
}

export interface CashFlow {
  year: number;
  months: CashFlowMonth[];
}

/** Uma fatia do acompanhamento por tipo de despesa/receita. */
export interface AccountBreakdownRow {
  code: string | null;
  description: string;
  pago: number;
  emAberto: number;
  total: number;
}

export const financialEntryService = {
  async list(
    filter: FinancialEntryFilter = {}
  ): Promise<Paged<FinancialEntry>> {
    const { data } = await api.get<
      ApiEnvelope<Paged<FinancialEntry>>
    >("/financial-entries", {
      params: {
        limit: 100,
        ...filter,
        overdue:
          filter.overdue === true ? "true" : undefined,
      },
    });

    return data.data;
  },

  async create(
    payload: FinancialEntryPayload
  ): Promise<FinancialEntry> {
    const { data } = await api.post<
      ApiEnvelope<FinancialEntry>
    >("/financial-entries", payload);

    return data.data;
  },

  async update(
    id: string,
    payload: Partial<Omit<FinancialEntryPayload, "type">>
  ): Promise<FinancialEntry> {
    const { data } = await api.patch<
      ApiEnvelope<FinancialEntry>
    >(`/financial-entries/${id}`, payload);

    return data.data;
  },

  async settle(
    id: string,
    payload: SettlePayload
  ): Promise<FinancialEntry> {
    const { data } = await api.patch<
      ApiEnvelope<FinancialEntry>
    >(`/financial-entries/${id}/settle`, payload);

    return data.data;
  },

  async reopen(id: string): Promise<FinancialEntry> {
    const { data } = await api.patch<
      ApiEnvelope<FinancialEntry>
    >(`/financial-entries/${id}/reopen`);

    return data.data;
  },

  async cancel(id: string): Promise<FinancialEntry> {
    const { data } = await api.patch<
      ApiEnvelope<FinancialEntry>
    >(`/financial-entries/${id}/cancel`);

    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/financial-entries/${id}`);
  },

  async getCashFlow(year: number): Promise<CashFlow> {
    const { data } = await api.get<ApiEnvelope<CashFlow>>(
      "/financial-entries/cash-flow",
      { params: { year } }
    );

    return data.data;
  },

  /**
   * Quanto foi de cada tipo de despesa (ou receita) no ano, separando
   * pago de em aberto.
   */
  async getAccountBreakdown(
    year: number,
    type: "PAYABLE" | "RECEIVABLE" = "PAYABLE"
  ): Promise<AccountBreakdownRow[]> {
    const { data } = await api.get<ApiEnvelope<AccountBreakdownRow[]>>(
      "/financial-entries/account-breakdown",
      { params: { year, type } }
    );

    return data.data ?? [];
  },
};
