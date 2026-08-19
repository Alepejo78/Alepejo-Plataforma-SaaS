import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export interface LicenseModule {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  route?: string | null;
  sortOrder?: number;
  active?: boolean;
  monthlyPrice?: string | number | null;
  yearlyPrice?: string | number | null;
}

export interface CompanyModuleLicense {
  id: string;
  moduleId: string;
  active: boolean;
  trial: boolean;
  expiresAt: string | null;
  module: LicenseModule;
}

export interface LicensePlan {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  monthlyPrice?: string | number | null;
  yearlyPrice?: string | number | null;
  setupFee?: string | number | null;
  maxUsers?: number | null;
  sortOrder?: number;
  highlighted?: boolean;
  active?: boolean;
  planModules?: {
    included: boolean;
    module: LicenseModule;
  }[];
}

export interface PlanPayload {
  code: string;
  name: string;
  description?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  setupFee?: number;
  maxUsers?: number;
  sortOrder?: number;
  highlighted?: boolean;
  active?: boolean;
  moduleIds?: string[];
}

export interface ModulePayload {
  code: string;
  name: string;
  description?: string;
  icon?: string;
  route?: string;
  sortOrder?: number;
  active?: boolean;
  monthlyPrice?: number;
  yearlyPrice?: number;
}

export type CompanyPlanStatus =
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "BLOCKED"
  | "CANCELLED";

export interface CompanyPlanLicense {
  id: string;
  planId: string;
  active: boolean;
  /** Prisma: startDate/endDate — nomeados assim aqui só por causa do apelido em findCompany(). */
  startDate: string;
  endDate: string | null;
  trialEndsAt?: string | null;
  status: CompanyPlanStatus;
  billingCycle: "MONTHLY" | "YEARLY";
  currentPeriodEnd?: string | null;
  graceUntil?: string | null;
  plan: LicensePlan;
}

/**
 * GET /identity/license/me devolve a Company com o plano e os módulos
 * aninhados (ver LicenseRepository.findCompany no backend).
 */
export interface MyLicense {
  id: string;
  code: string;
  legalName: string;
  tradeName: string;
  companyPlan: CompanyPlanLicense | null;
  companyModules: CompanyModuleLicense[];
}

export interface PlatformSettings {
  id: string;
  trialDays: number;
}

export const licenseService = {
  async getPlatformSettings(): Promise<PlatformSettings> {
    const { data } = await api.get<ApiEnvelope<PlatformSettings>>(
      "/identity/license/platform-settings"
    );

    return data.data;
  },

  async updatePlatformSettings(
    trialDays: number
  ): Promise<PlatformSettings> {
    const { data } = await api.patch<ApiEnvelope<PlatformSettings>>(
      "/identity/license/platform-settings",
      { trialDays }
    );

    return data.data;
  },

  async me(): Promise<MyLicense> {
    const { data } = await api.get<ApiEnvelope<MyLicense>>(
      "/identity/license/me"
    );

    return data.data;
  },

  // Catálogo — administração da plataforma (platform.license.manage)

  async listPlans(): Promise<LicensePlan[]> {
    const { data } = await api.get<ApiEnvelope<LicensePlan[]>>(
      "/identity/license/plans"
    );

    return data.data ?? [];
  },

  async createPlan(payload: PlanPayload): Promise<LicensePlan> {
    const { data } = await api.post<ApiEnvelope<LicensePlan>>(
      "/identity/license/plans",
      payload
    );

    return data.data;
  },

  async updatePlan(
    id: string,
    payload: Partial<PlanPayload>
  ): Promise<LicensePlan> {
    const { data } = await api.patch<ApiEnvelope<LicensePlan>>(
      `/identity/license/plans/${id}`,
      payload
    );

    return data.data;
  },

  async removePlan(id: string): Promise<void> {
    await api.delete(`/identity/license/plans/${id}`);
  },

  async listModules(): Promise<LicenseModule[]> {
    const { data } = await api.get<ApiEnvelope<LicenseModule[]>>(
      "/identity/license/modules"
    );

    return data.data ?? [];
  },

  async updateModule(
    id: string,
    payload: Partial<ModulePayload>
  ): Promise<LicenseModule> {
    const { data } = await api.patch<ApiEnvelope<LicenseModule>>(
      `/identity/license/modules/${id}`,
      payload
    );

    return data.data;
  },

  /** Autoatendimento — monta/ajusta o plano por módulo avulso (vira Plano Customizado). */
  async setCustomModules(moduleIds: string[]): Promise<MyLicense> {
    const { data } = await api.post<ApiEnvelope<MyLicense>>(
      "/identity/license/me/custom-modules",
      { moduleIds }
    );

    return data.data;
  },
};
