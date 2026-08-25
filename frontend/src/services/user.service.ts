import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export type UserStatus =
  | "PENDING_ACTIVATION"
  | "ACTIVE"
  | "PASSWORD_EXPIRED"
  | "LOCKED"
  | "BLOCKED"
  | "DISABLED";

export interface SystemUser {
  id: string;
  companyId: string;
  name: string;
  email: string;
  department?: string | null;
  manager?: string | null;
  alias?: string | null;
  status: UserStatus;
  mustChangePassword: boolean;
  lastLoginAt?: string | null;
  lockedUntil?: string | null;
  active: boolean;
  roles?: {
    role: { id: string; name: string };
  }[];
  /** Empresas do grupo que este login também acessa (login cruzado). */
  companies?: { companyId: string }[];
  /** Empresa em que este login entra por padrão ao fazer login. */
  defaultCompanyId?: string | null;
}

export type UserPayload = {
  name: string;
  email: string;
  department?: string;
  manager?: string;
  alias?: string;
  roleId?: string;
  /** Empresas do grupo (além da empresa dona do cadastro) com acesso via login cruzado. */
  companyIds?: string[];
  /** Empresa em que este login deve entrar por padrão ao fazer login. */
  defaultCompanyId?: string;
};

export const userService = {
  async list(): Promise<SystemUser[]> {
    const { data } = await api.get<ApiEnvelope<SystemUser[]>>(
      "/users"
    );

    return data.data ?? [];
  },

  async getById(id: string): Promise<SystemUser> {
    const { data } = await api.get<ApiEnvelope<SystemUser>>(
      `/users/${id}`
    );

    return data.data;
  },

  async create(
    payload: UserPayload
  ): Promise<SystemUser> {
    const { data } = await api.post<ApiEnvelope<SystemUser>>(
      "/users",
      // Usuário novo nasce com uma senha aleatória descartável — o
      // acesso real chega pelo fluxo de "definir senha" por e-mail.
      { ...payload, password: crypto.randomUUID() }
    );

    return data.data;
  },

  async update(
    id: string,
    payload: Partial<UserPayload>
  ): Promise<SystemUser> {
    const { data } = await api.patch<ApiEnvelope<SystemUser>>(
      `/users/${id}`,
      payload
    );

    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  async activate(id: string): Promise<SystemUser> {
    const { data } = await api.patch<ApiEnvelope<SystemUser>>(
      `/users/${id}/activate`
    );

    return data.data;
  },

  async deactivate(id: string): Promise<SystemUser> {
    const { data } = await api.patch<ApiEnvelope<SystemUser>>(
      `/users/${id}/deactivate`
    );

    return data.data;
  },

  async block(id: string): Promise<SystemUser> {
    const { data } = await api.patch<ApiEnvelope<SystemUser>>(
      `/users/${id}/block`
    );

    return data.data;
  },

  async unblock(id: string): Promise<SystemUser> {
    const { data } = await api.patch<ApiEnvelope<SystemUser>>(
      `/users/${id}/unblock`
    );

    return data.data;
  },

  async requestPasswordReset(
    id: string
  ): Promise<{ sent: boolean }> {
    const { data } = await api.post<
      ApiEnvelope<{ sent: boolean }>
    >(`/users/${id}/reset-password-email`);

    return data.data;
  },
};
