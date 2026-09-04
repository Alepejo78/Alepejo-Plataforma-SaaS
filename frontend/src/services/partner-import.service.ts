import { api } from "./api";
import type { PartnerRole, PartnerStatus, PersonType } from "./partner.service";
import type { ImportPreview } from "./product-import.service";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export interface PartnerImportRowData {
  document: string;
  roles?: PartnerRole[];
  legalName?: string;
  personType?: PersonType;
  tradeName?: string;
  stateRegistration?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  contactName?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  notes?: string;
  status?: PartnerStatus;
  existingId?: string;
}

export const partnerImportService = {
  async parse(file: File): Promise<ImportPreview<PartnerImportRowData>> {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await api.post<
      ApiEnvelope<ImportPreview<PartnerImportRowData>>
    >("/partner-import/parse", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return data.data;
  },

  async confirm(
    rows: (PartnerImportRowData & { action: "create" | "update" })[]
  ): Promise<{ created: number; updated: number }> {
    const { data } = await api.post<
      ApiEnvelope<{ created: number; updated: number }>
    >("/partner-import/confirm", { rows });

    return data.data;
  },
};
