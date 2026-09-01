import { api } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export interface ProfileAvatar {
  avatar: string | null;
  avatarEnabled: boolean;
}

export interface ProfilePreferences {
  brandColor: string | null;
  sidebarLayout: "vertical" | "horizontal" | null;
  maxOpenTabs: number | null;
}

export type UpdateProfilePreferencesPayload = Partial<ProfilePreferences>;

export const profileService = {
  async get(): Promise<ProfileAvatar> {
    const { data } = await api.get<ApiEnvelope<ProfileAvatar>>(
      "/users/me/avatar"
    );

    return data.data;
  },

  async setEnabled(enabled: boolean): Promise<ProfileAvatar> {
    const { data } = await api.patch<ApiEnvelope<ProfileAvatar>>(
      "/users/me/avatar",
      { enabled }
    );

    return data.data;
  },

  async uploadAvatar(file: File): Promise<ProfileAvatar> {
    const formData = new FormData();

    formData.append("file", file);

    const { data } = await api.post<ApiEnvelope<ProfileAvatar>>(
      "/users/me/avatar/photo",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    return data.data;
  },

  async getPreferences(): Promise<ProfilePreferences> {
    const { data } = await api.get<ApiEnvelope<ProfilePreferences>>(
      "/users/me/preferences"
    );

    return data.data;
  },

  async updatePreferences(
    payload: UpdateProfilePreferencesPayload
  ): Promise<ProfilePreferences> {
    const { data } = await api.patch<ApiEnvelope<ProfilePreferences>>(
      "/users/me/preferences",
      payload
    );

    return data.data;
  },
};
