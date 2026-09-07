import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "TELEFONE" | "ALEATORIA";

export interface EntryChargePublicInfo {
  companyName: string;
  companyLogo?: string | null;
  partnerName: string;
  amount: number;
  dueDate: string;
  status: string;
  pixKey: string | null;
  pixKeyType: PixKeyType | null;
  pixPayload: string | null;
  pixQrCodeImage: string | null;
}

export const entryChargePublicService = {
  async getInfo(id: string, token: string): Promise<EntryChargePublicInfo> {
    const { data } = await api.get<ApiEnvelope<EntryChargePublicInfo>>(
      `/entry-charges/public/${id}`,
      { params: { token } }
    );

    return data.data;
  },
};
