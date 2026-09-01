import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type PayrollStatus = "DRAFT" | "APPROVED" | "CANCELLED";
export type PayrollItemStatus = "PENDING" | "INCLUDED" | "EXCLUDED";
export type PayrollLineType = "PROVENTO" | "DESCONTO";
export type PayrollConfirmationStatus = "PENDENTE" | "CONFIRMADO";

export const PAYROLL_CONFIRMATION_STATUS_LABELS: Record<
  PayrollConfirmationStatus,
  string
> = {
  PENDENTE: "Aguardando confirmação",
  CONFIRMADO: "Recebimento confirmado",
};

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  DRAFT: "Rascunho",
  APPROVED: "Aprovada",
  CANCELLED: "Cancelada",
};

export const PAYROLL_ITEM_STATUS_LABELS: Record<PayrollItemStatus, string> = {
  PENDING: "Pendente",
  INCLUDED: "Incluído",
  EXCLUDED: "Excluído",
};

export interface PayrollItemLine {
  id: string;
  type: PayrollLineType;
  code: string;
  description: string;
  referenceValue?: string | null;
  amount: string | number;
  sortOrder: number;
}

export interface PayrollItem {
  id: string;
  payrollId: string;
  employeeId: string;
  status: PayrollItemStatus;
  baseSalary: string | number;
  salaryType: string;
  dependentsCount: number;
  workedMinutes: number;
  expectedMinutes: number;
  extraMinutes: number;
  extraAmount: string | number;
  unjustifiedAbsenceDays: number;
  absenceDeductionAmount: string | number;
  transportVoucherDeduction: string | number;
  otherEarnings: string | number;
  otherDeductions: string | number;
  grossAmount: string | number;
  inssBase: string | number;
  inssAmount: string | number;
  irrfBase: string | number;
  irrfAmount: string | number;
  netAmount: string | number;
  employerFgtsAmount: string | number;
  confirmationStatus: PayrollConfirmationStatus;
  confirmedAt?: string | null;
  confirmationSentAt?: string | null;
  lines: PayrollItemLine[];
  employee?: {
    id: string;
    name: string;
    employeeNumber?: number | null;
    cpf?: string | null;
    email?: string | null;
    mobile?: string | null;
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

export interface Payroll {
  id: string;
  companyId: string;
  number: number;
  competenceYear: number;
  competenceMonth: number;
  status: PayrollStatus;
  paymentDate?: string | null;
  generatedAt: string;
  approvedAt?: string | null;
  totalGross: string | number;
  totalDeductions: string | number;
  totalNet: string | number;
  totalEmployerFgts: string | number;
  observation?: string | null;
  items: PayrollItem[];
}

export interface GeneratePayrollPayload {
  competenceYear: number;
  competenceMonth: number;
  paymentDate?: string;
  observation?: string;
}

export interface AdjustPayrollItemPayload {
  otherEarnings?: number;
  otherDeductions?: number;
  observation?: string;
}

export interface PayrollFilter {
  competenceYear?: number;
  competenceMonth?: number;
  status?: PayrollStatus;
}

export function formatPayrollNumber(n: number) {
  return `FOL-${String(n).padStart(6, "0")}`;
}

export interface ChargesBucket {
  count: number;
  totalGross: number;
  totalInss: number;
  totalIrrf: number;
  totalFgts: number;
  totalVt: number;
  totalNet: number;
}

export interface MonthlyCharges {
  year: number;
  month: number;
  payroll: ChargesBucket;
  thirteenthSalary: ChargesBucket;
  vacation: ChargesBucket;
  consolidated: ChargesBucket;
}

export const payrollService = {
  async list(filter: PayrollFilter = {}): Promise<Payroll[]> {
    const { data } = await api.get<ApiEnvelope<Payroll[]>>("/payroll", {
      params: filter,
    });

    return data.data ?? [];
  },

  async getById(id: string): Promise<Payroll> {
    const { data } = await api.get<ApiEnvelope<Payroll>>(`/payroll/${id}`);

    return data.data;
  },

  async getItem(payrollId: string, itemId: string): Promise<PayrollItem> {
    const { data } = await api.get<ApiEnvelope<PayrollItem>>(
      `/payroll/${payrollId}/items/${itemId}`
    );

    return data.data;
  },

  async generate(payload: GeneratePayrollPayload): Promise<Payroll> {
    const { data } = await api.post<ApiEnvelope<Payroll>>(
      "/payroll/generate",
      payload
    );

    return data.data;
  },

  async recalculateItem(payrollId: string, itemId: string): Promise<PayrollItem> {
    const { data } = await api.patch<ApiEnvelope<PayrollItem>>(
      `/payroll/${payrollId}/items/${itemId}/recalculate`
    );

    return data.data;
  },

  async adjustItem(
    payrollId: string,
    itemId: string,
    payload: AdjustPayrollItemPayload
  ): Promise<PayrollItem> {
    const { data } = await api.patch<ApiEnvelope<PayrollItem>>(
      `/payroll/${payrollId}/items/${itemId}`,
      payload
    );

    return data.data;
  },

  async excludeItem(payrollId: string, itemId: string): Promise<PayrollItem> {
    const { data } = await api.patch<ApiEnvelope<PayrollItem>>(
      `/payroll/${payrollId}/items/${itemId}/exclude`
    );

    return data.data;
  },

  async includeItem(payrollId: string, itemId: string): Promise<PayrollItem> {
    const { data } = await api.patch<ApiEnvelope<PayrollItem>>(
      `/payroll/${payrollId}/items/${itemId}/include`
    );

    return data.data;
  },

  async approve(id: string): Promise<Payroll> {
    const { data } = await api.patch<ApiEnvelope<Payroll>>(
      `/payroll/${id}/approve`
    );

    return data.data;
  },

  async reverse(id: string): Promise<Payroll> {
    const { data } = await api.patch<ApiEnvelope<Payroll>>(
      `/payroll/${id}/reverse`
    );

    return data.data;
  },

  async cancel(id: string): Promise<Payroll> {
    const { data } = await api.patch<ApiEnvelope<Payroll>>(
      `/payroll/${id}/cancel`
    );

    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/payroll/${id}`);
  },

  async confirmItem(payrollId: string, itemId: string): Promise<PayrollItem> {
    const { data } = await api.patch<ApiEnvelope<PayrollItem>>(
      `/payroll/${payrollId}/items/${itemId}/confirm`
    );

    return data.data;
  },

  async sendConfirmation(
    payrollId: string,
    itemId: string
  ): Promise<{ sent: boolean; channels: string[] }> {
    const { data } = await api.post<
      ApiEnvelope<{ sent: boolean; channels: string[] }>
    >(`/payroll/${payrollId}/items/${itemId}/send-confirmation`);

    return data.data;
  },

  async getMonthlyCharges(year: number, month: number): Promise<MonthlyCharges> {
    const { data } = await api.get<ApiEnvelope<MonthlyCharges>>(
      "/payroll/reports/monthly-charges",
      { params: { year, month } }
    );

    return data.data;
  },
};

export interface PayrollPublicInfo {
  employeeName: string;
  companyName: string;
  competence: string;
  grossAmount: number;
  totalDeductions: number;
  netAmount: number;
  paymentDate?: string | null;
  status: PayrollConfirmationStatus;
}

/** Rotas públicas (sem login) do link de confirmação enviado por e-mail/WhatsApp. */
export const payrollConfirmationPublicService = {
  async getInfo(
    payrollId: string,
    itemId: string,
    token: string
  ): Promise<PayrollPublicInfo> {
    const { data } = await api.get<ApiEnvelope<PayrollPublicInfo>>(
      `/payroll/public/${payrollId}/${itemId}`,
      { params: { token } }
    );

    return data.data;
  },

  async confirm(
    payrollId: string,
    itemId: string,
    token: string
  ): Promise<void> {
    await api.post(
      `/payroll/public/${payrollId}/${itemId}/confirm`,
      undefined,
      { params: { token } }
    );
  },
};
