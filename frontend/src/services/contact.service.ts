import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type ContactPayload = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
};

export const contactService = {
  async submit(payload: ContactPayload): Promise<{ sent: boolean }> {
    const { data } = await api.post<ApiEnvelope<{ sent: boolean }>>(
      "/contact",
      payload
    );

    return data.data;
  },
};
