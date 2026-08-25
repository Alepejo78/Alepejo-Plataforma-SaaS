import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type PartnerRole =
  | "CUSTOMER"
  | "SUPPLIER"
  | "CARRIER"
  | "SALES_REP";

export type PersonType = "INDIVIDUAL" | "COMPANY";

export type PartnerStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "BLOCKED";

export interface BusinessPartner {
  id: string;
  roles: PartnerRole[];
  personType: PersonType;
  legalName: string;
  tradeName?: string | null;
  document: string;
  stateRegistration?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  contactName?: string | null;
  zipCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
  status: PartnerStatus;
  active: boolean;
  createdAt?: string;
  createdByName?: string | null;
  updatedByName?: string | null;
}

export interface PartnerListResult {
  data: BusinessPartner[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PartnerFilter {
  search?: string;
  role?: PartnerRole;
  status?: PartnerStatus;
  page?: number;
  limit?: number;
}

export type PartnerPayload = Omit<
  BusinessPartner,
  "id" | "active"
> & {
  active?: boolean;
};

export const ROLE_LABELS: Record<PartnerRole, string> = {
  CUSTOMER: "Cliente",
  SUPPLIER: "Fornecedor",
  CARRIER: "Transportadora",
  SALES_REP: "Representante",
};

export const partnerService = {
  async list(
    filter: PartnerFilter = {}
  ): Promise<PartnerListResult> {
    const { data } = await api.get<
      ApiEnvelope<PartnerListResult>
    >("/business-partners", { params: filter });

    return data.data;
  },

  async getById(id: string): Promise<BusinessPartner> {
    const { data } = await api.get<
      ApiEnvelope<BusinessPartner>
    >(`/business-partners/${id}`);

    return data.data;
  },

  async create(
    payload: Partial<PartnerPayload>
  ): Promise<BusinessPartner> {
    const { data } = await api.post<
      ApiEnvelope<BusinessPartner>
    >("/business-partners", payload);

    return data.data;
  },

  async update(
    id: string,
    payload: Partial<PartnerPayload>
  ): Promise<BusinessPartner> {
    const { data } = await api.patch<
      ApiEnvelope<BusinessPartner>
    >(`/business-partners/${id}`, payload);

    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/business-partners/${id}`);
  },
};
