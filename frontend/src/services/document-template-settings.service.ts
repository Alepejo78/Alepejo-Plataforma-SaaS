import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export interface DocumentTemplateSettings {
  id: string;
  companyId: string;
  pdfHeader: string | null;
  pdfFooter: string | null;
}

export interface DocumentTemplateSettingsPayload {
  pdfHeader?: string;
  pdfFooter?: string;
}

export const documentTemplateSettingsService = {
  async get(): Promise<DocumentTemplateSettings> {
    const { data } = await api.get<ApiEnvelope<DocumentTemplateSettings>>(
      "/document-template-settings"
    );

    return data.data;
  },

  async update(
    payload: DocumentTemplateSettingsPayload
  ): Promise<DocumentTemplateSettings> {
    const { data } = await api.put<ApiEnvelope<DocumentTemplateSettings>>(
      "/document-template-settings",
      payload
    );

    return data.data;
  },
};
