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
  maxUsers?: number | null;
  planModules?: {
    included: boolean;
    module: LicenseModule;
  }[];
}

export interface CompanyPlanLicense {
  id: string;
  planId: string;
  active: boolean;
  startedAt: string;
  expiresAt: string | null;
  trialEndsAt?: string | null;
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

export const licenseService = {
  async me(): Promise<MyLicense> {
    const { data } = await api.get<ApiEnvelope<MyLicense>>(
      "/identity/license/me"
    );

    return data.data;
  },
};
