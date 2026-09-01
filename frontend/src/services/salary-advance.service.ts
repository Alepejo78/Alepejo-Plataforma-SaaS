import { api } from "./api";
import type { PayrollConfirmationStatus, PayrollStatus } from "./payroll.service";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export const SALARY_ADVANCE_STATUS_LABELS: Record<PayrollStatus, string> = {
  DRAFT: "Aguardando aprovação",
  APPROVED: "Aprovado",
  CANCELLED: "Cancelado",
};

export interface SalaryAdvance {
  id: string;
  companyId: string;
  employeeId: string;
  number: number;
  status: PayrollStatus;
  requestDate: string;
  amount: string | number;
  installments: number;
  observation?: string | null;
  approvedAt?: string | null;
  confirmationStatus: PayrollConfirmationStatus;
  confirmedAt?: string | null;
  confirmationSentAt?: string | null;
  employee?: {
    id: string;
    name: string;
    employeeNumber?: number | null;
    email?: string | null;
    mobile?: string | null;
    jobFunction?: { id: string; name: string } | null;
  };
  financialEntry?: {
    id: string;
    status: string;
    dueDate: string;
  } | null;
}

export interface CreateSalaryAdvancePayload {
  employeeId: string;
  amount: number;
  installments?: number;
  observation?: string;
}

export function formatSalaryAdvanceNumber(n: number) {
  return `ADT-${String(n).padStart(6, "0")}`;
}

export const salaryAdvanceService = {
  async list(
    filter: { employeeId?: string; status?: PayrollStatus } = {}
  ): Promise<SalaryAdvance[]> {
    const { data } = await api.get<ApiEnvelope<SalaryAdvance[]>>(
      "/salary-advances",
      { params: filter }
    );

    return data.data ?? [];
  },

  async getById(id: string): Promise<SalaryAdvance> {
    const { data } = await api.get<ApiEnvelope<SalaryAdvance>>(
      `/salary-advances/${id}`
    );

    return data.data;
  },

  async create(payload: CreateSalaryAdvancePayload): Promise<SalaryAdvance> {
    const { data } = await api.post<ApiEnvelope<SalaryAdvance>>(
      "/salary-advances",
      payload
    );

    return data.data;
  },

  async approve(id: string): Promise<SalaryAdvance> {
    const { data } = await api.patch<ApiEnvelope<SalaryAdvance>>(
      `/salary-advances/${id}/approve`
    );

    return data.data;
  },

  async reverse(id: string): Promise<SalaryAdvance> {
    const { data } = await api.patch<ApiEnvelope<SalaryAdvance>>(
      `/salary-advances/${id}/reverse`
    );

    return data.data;
  },

  async cancel(id: string): Promise<SalaryAdvance> {
    const { data } = await api.patch<ApiEnvelope<SalaryAdvance>>(
      `/salary-advances/${id}/cancel`
    );

    return data.data;
  },

  async confirmItem(id: string): Promise<SalaryAdvance> {
    const { data } = await api.patch<ApiEnvelope<SalaryAdvance>>(
      `/salary-advances/${id}/confirm`
    );

    return data.data;
  },

  async sendConfirmation(
    id: string
  ): Promise<{ sent: boolean; channels: string[] }> {
    const { data } = await api.post<
      ApiEnvelope<{ sent: boolean; channels: string[] }>
    >(`/salary-advances/${id}/send-confirmation`);

    return data.data;
  },
};

export interface SalaryAdvancePublicInfo {
  employeeName: string;
  companyName: string;
  companyLogo?: string | null;
  amount: number;
  installments: number;
  requestDate: string;
  status: PayrollConfirmationStatus;
}

export const salaryAdvanceConfirmationPublicService = {
  async getInfo(id: string, token: string): Promise<SalaryAdvancePublicInfo> {
    const { data } = await api.get<ApiEnvelope<SalaryAdvancePublicInfo>>(
      `/salary-advances/public/${id}`,
      { params: { token } }
    );

    return data.data;
  },

  async confirm(id: string, token: string): Promise<{ success: boolean }> {
    const { data } = await api.post<ApiEnvelope<{ success: boolean }>>(
      `/salary-advances/public/${id}/confirm`,
      undefined,
      { params: { token } }
    );

    return data.data;
  },
};
