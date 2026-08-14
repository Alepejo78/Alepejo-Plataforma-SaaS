import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type CompanySignupPayload = {
  legalName: string;
  tradeName?: string;
  document: string;
  email: string;
  phone?: string;
  adminName: string;
};

export type CompanyAdditionalPayload = {
  legalName: string;
  tradeName?: string;
  document: string;
  /** Obrigatório quando `document` é CPF — não tem raiz pra conferir automaticamente como o CNPJ. */
  isGroupCompany?: boolean;
  email?: string;
  phone?: string;
  adminName: string;
  adminEmail: string;
};

export const companyOnboardingService = {
  async signup(
    payload: CompanySignupPayload
  ): Promise<{ companyId: string }> {
    const { data } = await api.post<
      ApiEnvelope<{ companyId: string }>
    >("/companies/signup", payload);

    return data.data;
  },

  async createAdditional(
    payload: CompanyAdditionalPayload
  ): Promise<{ companyId: string }> {
    const { data } = await api.post<
      ApiEnvelope<{ companyId: string }>
    >("/companies/additional", payload);

    return data.data;
  },
};
