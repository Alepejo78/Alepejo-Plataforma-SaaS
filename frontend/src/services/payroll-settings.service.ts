import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type PayrollTaxType = "INSS" | "IRRF";

export interface PayrollTaxBracket {
  id?: string;
  taxType: PayrollTaxType;
  order: number;
  minBase: string | number;
  maxBase?: string | number | null;
  rate: string | number;
  deduction: string | number;
}

export interface PayrollTaxTable {
  id: string;
  companyId: string;
  validFrom: string;
  validTo?: string | null;
  fgtsPercentage: string | number;
  dependentDeductionValue: string | number;
  irrfReliefThreshold?: string | number | null;
  irrfReliefPhaseOutEnd?: string | number | null;
  irrfReliefBase?: string | number | null;
  irrfReliefFactor?: string | number | null;
  active: boolean;
  brackets: PayrollTaxBracket[];
}

export interface CreatePayrollTaxTablePayload {
  validFrom: string;
  fgtsPercentage?: number;
  dependentDeductionValue: number;
  irrfReliefThreshold?: number;
  irrfReliefPhaseOutEnd?: number;
  irrfReliefBase?: number;
  irrfReliefFactor?: number;
  brackets: {
    taxType: PayrollTaxType;
    order: number;
    minBase: number;
    maxBase?: number;
    rate: number;
    deduction: number;
  }[];
}

export interface PayrollSettings {
  id: string;
  companyId: string;
  extraHourSurchargePercentage: string | number;
  transportVoucherPercentage: string | number;
  thirteenthDefaultInstallments: number;
  hourBankClosingReminderDays: number;
  pointClosingReminderDays: number;
}

export interface UpdatePayrollSettingsPayload {
  extraHourSurchargePercentage?: number;
  transportVoucherPercentage?: number;
  thirteenthDefaultInstallments?: number;
  hourBankClosingReminderDays?: number;
  pointClosingReminderDays?: number;
}

export const payrollTaxTableService = {
  async list(): Promise<PayrollTaxTable[]> {
    const { data } = await api.get<ApiEnvelope<PayrollTaxTable[]>>(
      "/payroll/tax-tables"
    );

    return data.data ?? [];
  },

  async getActive(): Promise<PayrollTaxTable> {
    const { data } = await api.get<ApiEnvelope<PayrollTaxTable>>(
      "/payroll/tax-tables/active"
    );

    return data.data;
  },

  async create(
    payload: CreatePayrollTaxTablePayload
  ): Promise<PayrollTaxTable> {
    const { data } = await api.post<ApiEnvelope<PayrollTaxTable>>(
      "/payroll/tax-tables",
      payload
    );

    return data.data;
  },
};

export const payrollSettingsService = {
  async get(): Promise<PayrollSettings> {
    const { data } = await api.get<ApiEnvelope<PayrollSettings>>(
      "/payroll/settings"
    );

    return data.data;
  },

  async update(
    payload: UpdatePayrollSettingsPayload
  ): Promise<PayrollSettings> {
    const { data } = await api.patch<ApiEnvelope<PayrollSettings>>(
      "/payroll/settings",
      payload
    );

    return data.data;
  },
};
