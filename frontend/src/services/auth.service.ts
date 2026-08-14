import { api } from "./api";

import type {
  AuthUser,
  LoginCredentials,
} from "@/types/auth";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

interface LoginResponse {
  user: {
    id: string;
    companyId: string;
    name: string;
    email: string;
    status: string;
  };
  expiresIn: string;
}

export const authService = {
  /**
   * O backend grava os tokens em cookies httpOnly; a resposta traz
   * apenas os dados públicos da sessão.
   */
  async login(credentials: LoginCredentials) {
    const { data } = await api.post<ApiEnvelope<LoginResponse>>(
      "/auth/login",
      credentials
    );

    return data.data;
  },

  async me(): Promise<AuthUser> {
    const { data } = await api.get<ApiEnvelope<AuthUser>>(
      "/auth/me"
    );

    return data.data;
  },

  async logout() {
    await api.post("/auth/logout");
  },

  /** Login cruzado: troca a empresa ativa da sessão. */
  async switchCompany(companyId: string) {
    const { data } = await api.post<ApiEnvelope<LoginResponse>>(
      "/auth/switch-company",
      { companyId }
    );

    return data.data;
  },
};
