import { api } from "./api";
import { env } from "@/lib/env";
import type { SidebarLayout } from "@/types/auth";

interface ApiEnvelope<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

export interface CompanyBranding {
  systemName: string | null;
  brandColor: string | null;
  brandingColorEnabled: boolean;
  logo: string | null;
  logoDark: string | null;
  brandingLogoLightEnabled: boolean;
  brandingLogoDarkEnabled: boolean;
  brandingSystemNameEnabled: boolean;
  brandingThemeToggleEnabled: boolean;
  sidebarLayout: SidebarLayout;
}

export interface UpdateCompanyBrandingPayload {
  systemName?: string;
  brandColor?: string;
  colorEnabled?: boolean;
  logoLightEnabled?: boolean;
  logoDarkEnabled?: boolean;
  systemNameEnabled?: boolean;
  themeToggleEnabled?: boolean;
  sidebarLayout?: SidebarLayout;
}

export type BrandingTheme = "light" | "dark";

/** Prefixa caminhos relativos (`/uploads/...`) com a origem da API. */
export function brandingAssetUrl(
  path: string | null | undefined
): string | null {
  if (!path) {
    return null;
  }

  return path.startsWith("http") ? path : `${env.apiOrigin}${path}`;
}

export const companyBrandingService = {
  async get(): Promise<CompanyBranding> {
    const { data } = await api.get<
      ApiEnvelope<CompanyBranding>
    >("/companies/me/branding");

    return data.data;
  },

  async update(
    payload: UpdateCompanyBrandingPayload
  ): Promise<CompanyBranding> {
    const { data } = await api.patch<
      ApiEnvelope<CompanyBranding>
    >("/companies/me/branding", payload);

    return data.data;
  },

  async uploadLogo(
    theme: BrandingTheme,
    file: File
  ): Promise<CompanyBranding> {
    const formData = new FormData();

    formData.append("file", file);

    const { data } = await api.post<
      ApiEnvelope<CompanyBranding>
    >(`/companies/me/branding/logo?theme=${theme}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return data.data;
  },
};
