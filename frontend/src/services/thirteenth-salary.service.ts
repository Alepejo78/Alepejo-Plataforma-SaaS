import { api } from "./api";
import type {
  PayrollItemLine,
  PayrollStatus,
  PayrollItemStatus,
} from "./payroll.service";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export const THIRTEENTH_STATUS_LABELS: Record<PayrollStatus, string> = {
  DRAFT: "Rascunho",
  APPROVED: "Aprovada",
  CANCELLED: "Cancelada",
};

export const THIRTEENTH_ITEM_STATUS_LABELS: Record<PayrollItemStatus, string> = {
  PENDING: "Pendente",
  INCLUDED: "Incluído",
  EXCLUDED: "Excluído",
};

export interface ThirteenthSalaryItem {
  id: string;
  thirteenthSalaryId: string;
  employeeId: string;
  status: PayrollItemStatus;
  baseSalary: string | number;
  monthsWorked: number;
  grossAmount: string | number;
  previousInstallmentAmount: string | number;
  otherEarnings: string | number;
  otherDeductions: string | number;
  inssBase: string | number;
  inssAmount: string | number;
  irrfBase: string | number;
  irrfAmount: string | number;
  netAmount: string | number;
  employerFgtsAmount: string | number;
  lines: PayrollItemLine[];
  employee?: {
    id: string;
    name: string;
    employeeNumber?: number | null;
    cpf?: string | null;
    admissionDate?: string | null;
    bankName?: string | null;
    bankAgency?: string | null;
    bankAccount?: string | null;
    jobFunction?: { id: string; name: string } | null;
  };
  financialEntry?: {
    id: string;
    status: string;
    dueDate: string;
  } | null;
}

export interface ThirteenthSalary {
  id: string;
  companyId: string;
  number: number;
  year: number;
  installment: number;
  status: PayrollStatus;
  paymentDate?: string | null;
  generatedAt: string;
  approvedAt?: string | null;
  totalGross: string | number;
  totalDeductions: string | number;
  totalNet: string | number;
  totalEmployerFgts: string | number;
  observation?: string | null;
  items: ThirteenthSalaryItem[];
}

export interface GenerateThirteenthSalaryPayload {
  year: number;
  installment: 1 | 2;
  paymentDate?: string;
  observation?: string;
}

export interface AdjustThirteenthSalaryItemPayload {
  otherEarnings?: number;
  otherDeductions?: number;
  observation?: string;
}

export function formatThirteenthNumber(n: number) {
  return `13S-${String(n).padStart(6, "0")}`;
}

export const thirteenthSalaryService = {
  async list(filter: { year?: number; installment?: number } = {}): Promise<ThirteenthSalary[]> {
    const { data } = await api.get<ApiEnvelope<ThirteenthSalary[]>>("/thirteenth-salary", {
      params: filter,
    });

    return data.data ?? [];
  },

  async getById(id: string): Promise<ThirteenthSalary> {
    const { data } = await api.get<ApiEnvelope<ThirteenthSalary>>(`/thirteenth-salary/${id}`);

    return data.data;
  },

  async getItem(id: string, itemId: string): Promise<ThirteenthSalaryItem> {
    const { data } = await api.get<ApiEnvelope<ThirteenthSalaryItem>>(
      `/thirteenth-salary/${id}/items/${itemId}`
    );

    return data.data;
  },

  async generate(payload: GenerateThirteenthSalaryPayload): Promise<ThirteenthSalary> {
    const { data } = await api.post<ApiEnvelope<ThirteenthSalary>>(
      "/thirteenth-salary/generate",
      payload
    );

    return data.data;
  },

  async adjustItem(
    id: string,
    itemId: string,
    payload: AdjustThirteenthSalaryItemPayload
  ): Promise<ThirteenthSalaryItem> {
    const { data } = await api.patch<ApiEnvelope<ThirteenthSalaryItem>>(
      `/thirteenth-salary/${id}/items/${itemId}`,
      payload
    );

    return data.data;
  },

  async excludeItem(id: string, itemId: string): Promise<ThirteenthSalaryItem> {
    const { data } = await api.patch<ApiEnvelope<ThirteenthSalaryItem>>(
      `/thirteenth-salary/${id}/items/${itemId}/exclude`
    );

    return data.data;
  },

  async includeItem(id: string, itemId: string): Promise<ThirteenthSalaryItem> {
    const { data } = await api.patch<ApiEnvelope<ThirteenthSalaryItem>>(
      `/thirteenth-salary/${id}/items/${itemId}/include`
    );

    return data.data;
  },

  async approve(id: string): Promise<ThirteenthSalary> {
    const { data } = await api.patch<ApiEnvelope<ThirteenthSalary>>(
      `/thirteenth-salary/${id}/approve`
    );

    return data.data;
  },

  async reverse(id: string): Promise<ThirteenthSalary> {
    const { data } = await api.patch<ApiEnvelope<ThirteenthSalary>>(
      `/thirteenth-salary/${id}/reverse`
    );

    return data.data;
  },

  async cancel(id: string): Promise<ThirteenthSalary> {
    const { data } = await api.patch<ApiEnvelope<ThirteenthSalary>>(
      `/thirteenth-salary/${id}/cancel`
    );

    return data.data;
  },
};
