import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  active: boolean;
}

export const userService = {
  async list(): Promise<SystemUser[]> {
    const { data } = await api.get<ApiEnvelope<SystemUser[]>>(
      "/users"
    );

    return data.data ?? [];
  },
};
