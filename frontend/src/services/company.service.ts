import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export interface Company {
  id: string;
  legalName: string;
  tradeName?: string | null;
  document: string;
  email?: string | null;
  phone?: string | null;
  active: boolean;
  rootCompanyId?: string | null;
}

export type CompanyUpdatePayload = Partial<{
  legalName: string;
  tradeName: string;
  email: string;
  phone: string;
  active: boolean;
}>;

export const companyService = {
  async getMine(): Promise<Company> {
    const { data } = await api.get<ApiEnvelope<Company>>(
      "/companies/me"
    );

    return data.data;
  },

  /** Empresas que o login atual pode acessar (login cruzado). */
  async myCompanies(): Promise<Company[]> {
    const { data } = await api.get<ApiEnvelope<Company[]>>(
      "/companies/my-companies"
    );

    return data.data;
  },

  async listGroup(): Promise<Company[]> {
    const { data } = await api.get<ApiEnvelope<Company[]>>(
      "/companies/group"
    );

    return data.data;
  },

  async updateInGroup(
    id: string,
    payload: CompanyUpdatePayload
  ): Promise<Company> {
    const { data } = await api.patch<ApiEnvelope<Company>>(
      `/companies/group/${id}`,
      payload
    );

    return data.data;
  },
};
