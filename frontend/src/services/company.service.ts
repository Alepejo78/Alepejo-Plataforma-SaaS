import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export interface Company {
  id: string;
  /** Código sequencial da empresa (ex.: "1000", filiais "1000_1") — não editável. */
  code: string;
  slug: string;
  legalName: string;
  tradeName?: string | null;
  document: string;
  email?: string | null;
  phone?: string | null;
  zipCode?: string | null;
  street?: string | null;
  number?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  active: boolean;
  rootCompanyId?: string | null;
}

export type CompanyUpdatePayload = Partial<{
  legalName: string;
  tradeName: string;
  email: string;
  phone: string;
  zipCode: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  active: boolean;
}>;

export const companyService = {
  async getMine(): Promise<Company> {
    const { data } = await api.get<ApiEnvelope<Company>>(
      "/companies/me"
    );

    return data.data;
  },

  async updateMine(
    payload: CompanyUpdatePayload
  ): Promise<Company> {
    const { data } = await api.patch<ApiEnvelope<Company>>(
      "/companies/me",
      payload
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
