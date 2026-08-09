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
}

export const companyService = {
  async getMine(): Promise<Company> {
    const { data } = await api.get<ApiEnvelope<Company>>(
      "/companies/me"
    );

    return data.data;
  },
};
