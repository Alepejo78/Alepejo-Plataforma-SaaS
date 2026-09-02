import { api } from "./api";
import type { PayrollConfirmationStatus } from "./payroll.service";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type TimeEntrySource =
  | "MANUAL"
  | "API"
  | "BARCODE"
  | "QRCODE"
  | "AJUSTE"
  | "AUTOLANCAMENTO";

export const TIME_ENTRY_SOURCE_LABELS: Record<
  TimeEntrySource,
  string
> = {
  MANUAL: "Manual",
  API: "Relógio de ponto",
  BARCODE: "Código de barras",
  QRCODE: "QR Code",
  AJUSTE: "Ajuste manual",
  AUTOLANCAMENTO: "Lançamento manual (colaborador)",
};

export interface DaySummaryEntry {
  id: string;
  timestamp: string;
  source: TimeEntrySource;
  observation?: string | null;
}

export interface DaySlots {
  start: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  end: string | null;
}

export interface DaySummary {
  employeeId: string;
  employeeName: string;
  date: string;
  entries: DaySummaryEntry[];
  slots: DaySlots;
  workedMinutes: number;
  expectedMinutes: number;
  extraMinutes: number;
  compensatedMinutes: number;
  hasSchedule: boolean;
  hasAdjustment: boolean;
  selfReported: boolean;
  status: "PENDING" | "APPROVED";
  approvedAt?: string | null;
}

export interface SelfReportDayPayload {
  date: string;
  start: string;
  breakStart: string;
  breakEnd: string;
  end: string;
}

export interface TimeEntryFilter {
  employeeId?: string;
  from?: string;
  to?: string;
}

export interface AdjustDayPayload {
  employeeId: string;
  date: string;
  start?: string;
  breakStart?: string;
  breakEnd?: string;
  end?: string;
  justification: string;
}

export interface TimeEntryAdjustment {
  id: string;
  employeeId: string;
  date: string;
  beforeStart?: string | null;
  beforeBreakStart?: string | null;
  beforeBreakEnd?: string | null;
  beforeEnd?: string | null;
  afterStart?: string | null;
  afterBreakStart?: string | null;
  afterBreakEnd?: string | null;
  afterEnd?: string | null;
  justification: string;
  adjustedByUserId: string;
  createdAt: string;
}

export type AbsenceType =
  | "FALTA_JUSTIFICADA"
  | "FALTA_INJUSTIFICADA"
  | "ABONO";

export const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  FALTA_JUSTIFICADA: "Falta justificada",
  FALTA_INJUSTIFICADA: "Falta injustificada",
  ABONO: "Abono",
};

export type AbsenceStatus = "PENDENTE" | "APROVADO" | "REJEITADO";

export const ABSENCE_STATUS_LABELS: Record<AbsenceStatus, string> = {
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
};

export interface AbsenceRecord {
  id: string;
  employeeId: string;
  date: string;
  type: AbsenceType;
  reason?: string | null;
  status: AbsenceStatus;
  approvedAt?: string | null;
  createdAt: string;

  employee?: { id: string; name: string } | null;
}

export interface AbsenceRecordPayload {
  employeeId: string;
  date: string;
  type: AbsenceType;
  reason?: string;
}

export interface AbsenceFilter {
  employeeId?: string;
  type?: AbsenceType;
  status?: AbsenceStatus;
  from?: string;
  to?: string;
}

export interface TimeClockApiKeyStatus {
  active: boolean;
  prefix: string | null;
  createdAt: string | null;
}

function minutesToLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  return `${h}h${String(m).padStart(2, "0")}`;
}

export interface CreatedTimeEntry {
  id: string;
  employeeId: string;
  timestamp: string;
  source: TimeEntrySource;
  employee?: { id: string; name: string } | null;
}

export const timeEntryService = {
  async create(payload: {
    employeeId: string;
    timestamp?: string;
    source?: TimeEntrySource;
    observation?: string;
  }): Promise<CreatedTimeEntry> {
    const { data } = await api.post<
      ApiEnvelope<CreatedTimeEntry>
    >("/time-entries", payload);

    return data.data;
  },

  async getDaySummary(
    filter: TimeEntryFilter = {}
  ): Promise<DaySummary[]> {
    const { data } = await api.get<ApiEnvelope<DaySummary[]>>(
      "/time-entries/day-summary",
      { params: filter }
    );

    return data.data ?? [];
  },

  async remove(id: string) {
    await api.delete(`/time-entries/${id}`);
  },

  async reverseAdjustment(id: string) {
    await api.delete(`/time-entries/adjustments/${id}`);
  },

  async approve(employeeId: string, date: string) {
    const { data } = await api.post<ApiEnvelope<unknown>>(
      "/time-entries/approve",
      { employeeId, date }
    );

    return data.data;
  },

  async reopen(employeeId: string, date: string) {
    const { data } = await api.post<ApiEnvelope<unknown>>(
      "/time-entries/reopen",
      { employeeId, date }
    );

    return data.data;
  },

  /** Ponto - Manual: o colaborador logado lança o próprio dia inteiro. */
  async selfReport(payload: SelfReportDayPayload) {
    const { data } = await api.post<ApiEnvelope<unknown>>(
      "/time-entries/self-report",
      payload
    );

    return data.data;
  },

  async adjust(payload: AdjustDayPayload) {
    const { data } = await api.patch<ApiEnvelope<unknown>>(
      "/time-entries/adjust",
      payload
    );

    return data.data;
  },

  async getAdjustments(
    filter: TimeEntryFilter = {}
  ): Promise<TimeEntryAdjustment[]> {
    const { data } = await api.get<
      ApiEnvelope<TimeEntryAdjustment[]>
    >("/time-entries/adjustments", { params: filter });

    return data.data ?? [];
  },
};

export const absenceRecordService = {
  async list(
    filter: AbsenceFilter = {}
  ): Promise<AbsenceRecord[]> {
    const { data } = await api.get<
      ApiEnvelope<AbsenceRecord[]>
    >("/absence-records", { params: filter });

    return data.data ?? [];
  },

  async create(
    payload: AbsenceRecordPayload
  ): Promise<AbsenceRecord> {
    const { data } = await api.post<
      ApiEnvelope<AbsenceRecord>
    >("/absence-records", payload);

    return data.data;
  },

  async update(
    id: string,
    payload: Partial<AbsenceRecordPayload>
  ): Promise<AbsenceRecord> {
    const { data } = await api.patch<
      ApiEnvelope<AbsenceRecord>
    >(`/absence-records/${id}`, payload);

    return data.data;
  },

  async remove(id: string) {
    await api.delete(`/absence-records/${id}`);
  },

  async approve(id: string): Promise<AbsenceRecord> {
    const { data } = await api.patch<
      ApiEnvelope<AbsenceRecord>
    >(`/absence-records/${id}/approve`);

    return data.data;
  },

  async reject(id: string): Promise<AbsenceRecord> {
    const { data } = await api.patch<
      ApiEnvelope<AbsenceRecord>
    >(`/absence-records/${id}/reject`);

    return data.data;
  },

  async reopen(id: string): Promise<AbsenceRecord> {
    const { data } = await api.patch<
      ApiEnvelope<AbsenceRecord>
    >(`/absence-records/${id}/reopen`);

    return data.data;
  },
};

export const timeClockApiKeyService = {
  async getStatus(): Promise<TimeClockApiKeyStatus> {
    const { data } = await api.get<
      ApiEnvelope<TimeClockApiKeyStatus>
    >("/time-clock/api-key");

    return data.data;
  },

  async generate(): Promise<{ apiKey: string }> {
    const { data } = await api.post<
      ApiEnvelope<{ apiKey: string }>
    >("/time-clock/api-key");

    return data.data;
  },

  async revoke(): Promise<void> {
    await api.delete("/time-clock/api-key");
  },
};

export { minutesToLabel };

export interface TimeEntryMonthlyConfirmation {
  id: string;
  companyId: string;
  employeeId: string;
  year: number;
  month: number;
  confirmationStatus: PayrollConfirmationStatus;
  confirmedAt?: string | null;
  confirmationSentAt?: string | null;
  employee?: { id: string; name: string; employeeNumber?: number | null };
}

export interface SendConfirmationBulkResult {
  total: number;
  sent: number;
  failed: { employeeId: string; employeeName: string; reason: string }[];
}

export const timeEntryConfirmationService = {
  async list(filter: { year?: number; month?: number } = {}): Promise<TimeEntryMonthlyConfirmation[]> {
    const { data } = await api.get<ApiEnvelope<TimeEntryMonthlyConfirmation[]>>(
      "/time-entries/confirmations",
      { params: filter }
    );

    return data.data ?? [];
  },

  async send(employeeId: string, year: number, month: number): Promise<{ sent: boolean; channels: string[] }> {
    const { data } = await api.post<ApiEnvelope<{ sent: boolean; channels: string[] }>>(
      `/time-entries/confirmations/send/${employeeId}/${year}/${month}`
    );

    return data.data;
  },

  async sendBulk(year: number, month: number): Promise<SendConfirmationBulkResult> {
    const { data } = await api.post<ApiEnvelope<SendConfirmationBulkResult>>(
      `/time-entries/confirmations/send-bulk/${year}/${month}`
    );

    return data.data;
  },

  async confirmItem(id: string): Promise<TimeEntryMonthlyConfirmation> {
    const { data } = await api.patch<ApiEnvelope<TimeEntryMonthlyConfirmation>>(
      `/time-entries/confirmations/${id}/confirm`
    );

    return data.data;
  },

  async confirmMine(year: number, month: number): Promise<TimeEntryMonthlyConfirmation> {
    const { data } = await api.post<ApiEnvelope<TimeEntryMonthlyConfirmation>>(
      `/time-entries/confirmations/me/${year}/${month}/confirm`
    );

    return data.data;
  },
};

export interface TimeReportDay {
  dateLabel: string;
  start: string;
  breakStart: string;
  breakEnd: string;
  end: string;
  workedLabel: string;
  extraLabel: string;
}

export interface TimeEntryConfirmationPublicInfo {
  employeeName: string;
  companyName: string;
  companyLogo?: string | null;
  year: number;
  month: number;
  days: TimeReportDay[];
  status: PayrollConfirmationStatus;
}

export const timeEntryConfirmationPublicService = {
  async getInfo(id: string, token: string): Promise<TimeEntryConfirmationPublicInfo> {
    const { data } = await api.get<ApiEnvelope<TimeEntryConfirmationPublicInfo>>(
      `/time-entries/confirmations/public/${id}`,
      { params: { token } }
    );

    return data.data;
  },

  async confirm(id: string, token: string): Promise<{ success: boolean }> {
    const { data } = await api.post<ApiEnvelope<{ success: boolean }>>(
      `/time-entries/confirmations/public/${id}/confirm`,
      undefined,
      { params: { token } }
    );

    return data.data;
  },
};
