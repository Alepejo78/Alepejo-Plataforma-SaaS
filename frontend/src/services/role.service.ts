import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

interface Paginated<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  active: boolean;
}

export type RolePayload = {
  code: string;
  name: string;
  description?: string;
  active?: boolean;
};

export const roleService = {
  async list(search = ""): Promise<Role[]> {
    const { data } = await api.get<
      ApiEnvelope<Paginated<Role>>
    >("/identity/roles", {
      params: { search: search || undefined, limit: 10000 },
    });

    return data.data.items;
  },

  async getById(id: string): Promise<Role> {
    const { data } = await api.get<ApiEnvelope<Role>>(
      `/identity/roles/${id}`
    );

    return data.data;
  },

  async create(payload: RolePayload): Promise<Role> {
    const { data } = await api.post<ApiEnvelope<Role>>(
      "/identity/roles",
      payload
    );

    return data.data;
  },

  async update(
    id: string,
    payload: Partial<RolePayload>
  ): Promise<Role> {
    const { data } = await api.patch<ApiEnvelope<Role>>(
      `/identity/roles/${id}`,
      payload
    );

    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/identity/roles/${id}`);
  },
};
