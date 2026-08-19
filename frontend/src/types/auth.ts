export type PermissionEffect = "ALLOW" | "DENY";

export interface AuthPermission {
  code: string;
  effect: PermissionEffect;
}

export interface AuthModule {
  code: string;
  name: string;
  trial: boolean;
  expiresAt: string | null;
}

export type SidebarLayout = "vertical" | "horizontal";

export interface AuthCompany {
  id: string;
  code: string;
  slug: string;
  legalName: string;
  tradeName: string;
  /** Personalização (módulo BRANDING) — null quando não configurada. */
  logo: string | null;
  logoDark: string | null;
  systemName: string | null;
  /** Cada item só vale se o módulo BRANDING estiver licenciado. */
  brandingLogoLightEnabled: boolean;
  brandingLogoDarkEnabled: boolean;
  brandingSystemNameEnabled: boolean;
  brandingThemeToggleEnabled: boolean;
  sidebarLayout: SidebarLayout;
}

/**
 * Espelha o retorno de GET /auth/me (JwtStrategy.validate no backend).
 */
export interface AuthUser {
  id: string;
  companyId: string;
  email: string;
  name: string;
  status: string;
  /** Foto de perfil (autoatendimento) — null quando não enviada. */
  avatar: string | null;
  avatarEnabled: boolean;
  permissions: AuthPermission[];
  modules: AuthModule[];
  company: AuthCompany;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
