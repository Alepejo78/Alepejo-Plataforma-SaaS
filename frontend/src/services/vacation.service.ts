import { api } from "./api";
import type {
  PayrollConfirmationStatus,
  PayrollItemLine,
  PayrollStatus,
} from "./payroll.service";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export const VACATION_STATUS_LABELS: Record<PayrollStatus, string> = {
  DRAFT: "Aguardando aprovação",
  APPROVED: "Aprovada",
  CANCELLED: "Cancelada",
};

export interface VacationPeriod {
  id: string;
  companyId: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  concessiveDeadline: string;
  totalDays: number;
  usedDays: number;
  soldDays: number;
  status: "OPEN" | "CLOSED";
}

export interface VacationBalance {
  period: VacationPeriod;
  availableDays: number;
  overdue: boolean;
}

export interface VacationGrant {
  id: string;
  companyId: string;
  employeeId: string;
  vacationPeriodId: string;
  number: number;
  status: PayrollStatus;
  startDate: string;
  days: number;
  soldDays: number;
  endDate: string;
  returnDate: string;
  baseSalary: string | number;
  vacationAmount: string | number;
  constitutionalThirdAmount: string | number;
  soldAmount: string | number;
  soldThirdAmount: string | number;
  otherEarnings: string | number;
  otherDeductions: string | number;
  grossAmount: string | number;
  inssBase: string | number;
  inssAmount: string | number;
  irrfBase: string | number;
  irrfAmount: string | number;
  netAmount: string | number;
  employerFgtsAmount: string | number;
  observation?: string | null;
  confirmationStatus: PayrollConfirmationStatus;
  confirmedAt?: string | null;
  confirmationSentAt?: string | null;
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
  vacationPeriod?: VacationPeriod;
  financialEntry?: {
    id: string;
    status: string;
    dueDate: string;
  } | null;
}

export interface CreateVacationGrantPayload {
  employeeId: string;
  startDate: string;
  days: number;
  soldDays?: number;
  observation?: string;
}

/** Igual a `CreateVacationGrantPayload`, sem `employeeId` — sempre o do usuário logado. */
export type CreateMyVacationGrantPayload = Omit<
  CreateVacationGrantPayload,
  "employeeId"
>;

export interface AdjustVacationGrantPayload {
  otherEarnings?: number;
  otherDeductions?: number;
}

export function formatVacationNumber(n: number) {
  return `FER-${String(n).padStart(6, "0")}`;
}

export const vacationService = {
  async getBalance(employeeId: string): Promise<VacationBalance> {
    const { data } = await api.get<ApiEnvelope<VacationBalance>>(
      "/vacation/balance",
      { params: { employeeId } }
    );

    return data.data;
  },

  async listPeriods(employeeId: string): Promise<VacationPeriod[]> {
    const { data } = await api.get<ApiEnvelope<VacationPeriod[]>>(
      "/vacation/periods",
      { params: { employeeId } }
    );

    return data.data ?? [];
  },

  async list(
    filter: { employeeId?: string; status?: PayrollStatus } = {}
  ): Promise<VacationGrant[]> {
    const { data } = await api.get<ApiEnvelope<VacationGrant[]>>(
      "/vacation/grants",
      { params: filter }
    );

    return data.data ?? [];
  },

  async getById(id: string): Promise<VacationGrant> {
    const { data } = await api.get<ApiEnvelope<VacationGrant>>(
      `/vacation/grants/${id}`
    );

    return data.data;
  },

  async create(payload: CreateVacationGrantPayload): Promise<VacationGrant> {
    const { data } = await api.post<ApiEnvelope<VacationGrant>>(
      "/vacation/grants",
      payload
    );

    return data.data;
  },

  async adjust(
    id: string,
    payload: AdjustVacationGrantPayload
  ): Promise<VacationGrant> {
    const { data } = await api.patch<ApiEnvelope<VacationGrant>>(
      `/vacation/grants/${id}`,
      payload
    );

    return data.data;
  },

  async approve(id: string): Promise<VacationGrant> {
    const { data } = await api.patch<ApiEnvelope<VacationGrant>>(
      `/vacation/grants/${id}/approve`
    );

    return data.data;
  },

  async reverse(id: string): Promise<VacationGrant> {
    const { data } = await api.patch<ApiEnvelope<VacationGrant>>(
      `/vacation/grants/${id}/reverse`
    );

    return data.data;
  },

  async cancel(id: string): Promise<VacationGrant> {
    const { data } = await api.patch<ApiEnvelope<VacationGrant>>(
      `/vacation/grants/${id}/cancel`
    );

    return data.data;
  },

  async confirmItem(id: string): Promise<VacationGrant> {
    const { data } = await api.patch<ApiEnvelope<VacationGrant>>(
      `/vacation/grants/${id}/confirm`
    );

    return data.data;
  },

  async sendConfirmation(
    id: string
  ): Promise<{ sent: boolean; channels: string[] }> {
    const { data } = await api.post<
      ApiEnvelope<{ sent: boolean; channels: string[] }>
    >(`/vacation/grants/${id}/send-confirmation`);

    return data.data;
  },

  /** Minhas Férias (autoatendimento) — saldo/histórico do colaborador logado. */
  async getMinePeriods(): Promise<VacationPeriod[]> {
    const { data } = await api.get<ApiEnvelope<VacationPeriod[]>>(
      "/vacation/me/periods"
    );

    return data.data ?? [];
  },

  async getMineGrants(): Promise<VacationGrant[]> {
    const { data } = await api.get<ApiEnvelope<VacationGrant[]>>(
      "/vacation/me/grants"
    );

    return data.data ?? [];
  },

  async createMine(
    payload: CreateMyVacationGrantPayload
  ): Promise<VacationGrant> {
    const { data } = await api.post<ApiEnvelope<VacationGrant>>(
      "/vacation/me/grants",
      payload
    );

    return data.data;
  },
};

export interface VacationPublicInfo {
  employeeName: string;
  companyName: string;
  companyLogo?: string | null;
  startDate: string;
  endDate: string;
  returnDate: string;
  days: number;
  netAmount: number;
  status: PayrollConfirmationStatus;
}

export const vacationConfirmationPublicService = {
  async getInfo(id: string, token: string): Promise<VacationPublicInfo> {
    const { data } = await api.get<ApiEnvelope<VacationPublicInfo>>(
      `/vacation/public/${id}`,
      { params: { token } }
    );

    return data.data;
  },

  async confirm(id: string, token: string): Promise<{ success: boolean }> {
    const { data } = await api.post<ApiEnvelope<{ success: boolean }>>(
      `/vacation/public/${id}/confirm`,
      undefined,
      { params: { token } }
    );

    return data.data;
  },
};
