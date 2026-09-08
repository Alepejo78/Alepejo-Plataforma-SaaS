import { api } from "./api";
import type { PaymentMethod } from "./financial-entry.service";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export interface WorkshopQuoteParsedPartner {
  document: string | null;
  legalName: string | null;
  phone: string | null;
  mobile: string | null;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  city: string | null;
  state: string | null;
  existingPartnerId: string | null;
}

export interface WorkshopQuoteParsedItem {
  kind: "PART" | "SERVICE";
  code: string;
  description: string;
  unit: string;
  quantity: number;
  grossValue: number;
  netValue: number;
  existingProductId: string | null;
}

export interface ParsedWorkshopQuote {
  documentNumber: string | null;
  issueDate: string | null;
  partner: WorkshopQuoteParsedPartner;
  items: WorkshopQuoteParsedItem[];
  paymentMethodText: string | null;
  paymentMethod: PaymentMethod;
  installmentsCount: number;
  termDays: number;
  totalAmount: number | null;
  warnings: string[];
}

export interface WorkshopQuoteConfirmPartnerPayload {
  partnerId?: string;
  document?: string;
  legalName?: string;
  phone?: string;
  mobile?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  city?: string;
  state?: string;
}

export interface WorkshopQuoteConfirmItemPayload {
  kind: "PART" | "SERVICE";
  code: string;
  description: string;
  unit: string;
  quantity: number;
  netValue: number;
  grossValue: number;
}

export interface ConfirmWorkshopQuoteImportPayload {
  partner: WorkshopQuoteConfirmPartnerPayload;
  documentNumber: string;
  issueDate: string;
  paymentMethod: PaymentMethod;
  installmentsCount: number;
  termDays: number;
  items: WorkshopQuoteConfirmItemPayload[];
}

export interface ConfirmWorkshopQuoteImportResult {
  partnerId: string;
  createdProducts: string[];
  entriesCreated: number;
}

export const workshopQuoteImportService = {
  async parseFile(file: File): Promise<ParsedWorkshopQuote> {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await api.post<ApiEnvelope<ParsedWorkshopQuote>>(
      "/workshop-quote-import/parse",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    return data.data;
  },

  async confirm(
    payload: ConfirmWorkshopQuoteImportPayload
  ): Promise<ConfirmWorkshopQuoteImportResult> {
    const { data } = await api.post<
      ApiEnvelope<ConfirmWorkshopQuoteImportResult>
    >("/workshop-quote-import/confirm", payload);

    return data.data;
  },
};
