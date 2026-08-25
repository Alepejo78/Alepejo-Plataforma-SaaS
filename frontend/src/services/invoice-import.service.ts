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

export interface ParsedInvoiceItem {
  code: string | null;
  description: string;
  ncm: string | null;
  cfop: string | null;
  unit: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  ean: string | null;
}

export interface ParsedInvoiceInstallment {
  dueDate: string;
  amount: number;
}

export interface ParsedInvoiceParty {
  document: string;
  legalName: string;
  tradeName: string | null;
  email: string | null;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
}

export interface ParsedInvoice {
  kind: "NFE" | "NFSE";
  party: ParsedInvoiceParty | null;
  invoiceNumber: string | null;
  invoiceKey: string | null;
  invoiceIssueDate: string | null;
  items: ParsedInvoiceItem[];
  totalAmount: number | null;
  installments: ParsedInvoiceInstallment[];
  grossWeightKg: number | null;
  netWeightKg: number | null;
  warnings: string[];
}

export interface InvoicePartnerPayload {
  partnerId?: string;
  document?: string;
  legalName?: string;
  tradeName?: string;
  email?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
}

export interface InvoiceInstallmentPayload {
  dueDate: string;
  amount: number;
}

export interface ConfirmOrderImportPayload {
  partner: InvoicePartnerPayload;
  warehouseId: string;
  chartOfAccountId?: string;
  invoiceNumber?: string;
  invoiceKey?: string;
  invoiceIssueDate?: string;
  observation?: string;
  paymentMethod?: PaymentMethod;
  installments: InvoiceInstallmentPayload[];
  items: { productId: string; quantity: number; unitPrice: number }[];
  confirmReceipt?: boolean;
}

export interface ConfirmExpenseImportPayload {
  partner: InvoicePartnerPayload;
  chartOfAccountId?: string;
  issueDate: string;
  documentNumber?: string;
  documentKey?: string;
  documentType?: FinancialDocumentType;
  paymentMethod?: PaymentMethod;
  observation?: string;
  installments: InvoiceInstallmentPayload[];
}

export const invoiceImportService = {
  async parseXml(file: File): Promise<ParsedInvoice> {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await api.post<ApiEnvelope<ParsedInvoice>>(
      "/invoice-import/parse",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    return data.data;
  },

  async confirmPurchase(payload: ConfirmOrderImportPayload) {
    const { data } = await api.post<ApiEnvelope<unknown>>(
      "/invoice-import/purchase",
      payload
    );

    return data.data;
  },

  async confirmPurchaseExpense(payload: ConfirmExpenseImportPayload) {
    const { data } = await api.post<ApiEnvelope<unknown>>(
      "/invoice-import/purchase-expense",
      payload
    );

    return data.data;
  },

  async confirmSale(payload: ConfirmOrderImportPayload) {
    const { data } = await api.post<ApiEnvelope<unknown>>(
      "/invoice-import/sale",
      payload
    );

    return data.data;
  },

  async confirmSaleExpense(payload: ConfirmExpenseImportPayload) {
    const { data } = await api.post<ApiEnvelope<unknown>>(
      "/invoice-import/sale-expense",
      payload
    );

    return data.data;
  },
};
