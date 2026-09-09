import { api } from "./api";
import { env } from "@/lib/env";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export function documentTemplateAssetUrl(
  path: string | null | undefined
): string | null {
  if (!path) {
    return null;
  }

  return path.startsWith("http") ? path : `${env.apiOrigin}${path}`;
}

export interface DocumentTemplateSettings {
  id: string;
  companyId: string;
  pdfHeader: string | null;
  pdfFooter: string | null;
  templateImagePath: string | null;
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

  async uploadTemplateImage(
    file: File
  ): Promise<DocumentTemplateSettings> {
    const formData = new FormData();

    formData.append("file", file);

    const { data } = await api.post<
      ApiEnvelope<DocumentTemplateSettings>
    >("/document-template-settings/template-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return data.data;
  },

  async removeTemplateImage(): Promise<DocumentTemplateSettings> {
    const { data } = await api.delete<
      ApiEnvelope<DocumentTemplateSettings>
    >("/document-template-settings/template-image");

    return data.data;
  },
};
