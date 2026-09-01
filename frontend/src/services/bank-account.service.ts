import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type BankAccountType = "CORRENTE" | "POUPANCA";
export type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "TELEFONE" | "ALEATORIA";

export const BANK_ACCOUNT_TYPE_LABELS: Record<BankAccountType, string> = {
  CORRENTE: "Conta Corrente",
  POUPANCA: "Poupança",
};

export const PIX_KEY_TYPE_LABELS: Record<PixKeyType, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  EMAIL: "E-mail",
  TELEFONE: "Telefone",
  ALEATORIA: "Aleatória",
};

export interface BankAccount {
  id: string;
  companyId: string;
  description: string;
  bankName: string;
  agency?: string | null;
  accountNumber?: string | null;
  accountType?: BankAccountType | null;
  pixKeyType?: PixKeyType | null;
  pixKey?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccountPayload {
  description: string;
  bankName: string;
  agency?: string;
  accountNumber?: string;
  accountType?: BankAccountType;
  pixKeyType?: PixKeyType;
  pixKey?: string;
  active?: boolean;
}

export const bankAccountService = {
  async list(includeInactive = false): Promise<BankAccount[]> {
    const { data } = await api.get<ApiEnvelope<BankAccount[]>>(
      "/bank-accounts",
      { params: includeInactive ? { includeInactive: "true" } : {} }
    );

    return data.data ?? [];
  },

  async getById(id: string): Promise<BankAccount> {
    const { data } = await api.get<ApiEnvelope<BankAccount>>(
      `/bank-accounts/${id}`
    );

    return data.data;
  },

  async create(payload: BankAccountPayload): Promise<BankAccount> {
    const { data } = await api.post<ApiEnvelope<BankAccount>>(
      "/bank-accounts",
      payload
    );

    return data.data;
  },

  async update(
    id: string,
    payload: Partial<BankAccountPayload>
  ): Promise<BankAccount> {
    const { data } = await api.patch<ApiEnvelope<BankAccount>>(
      `/bank-accounts/${id}`,
      payload
    );

    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/bank-accounts/${id}`);
  },
};
