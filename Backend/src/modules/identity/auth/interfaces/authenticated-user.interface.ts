import { PermissionEffect } from '@prisma/client';

export { PermissionEffect };

export interface AuthenticatedPermission {
  code: string;
  effect: PermissionEffect;
}

export interface AuthenticatedModule {
  code: string;
  name: string;
  trial: boolean;
  expiresAt: Date | null;
}

export interface AuthenticatedCompany {
  id: string;
  code: string;
  legalName: string;
  tradeName: string;
  logo: string | null;
  logoDark: string | null;
  systemName: string | null;
  brandingLogoLightEnabled: boolean;
  brandingLogoDarkEnabled: boolean;
  brandingSystemNameEnabled: boolean;
  brandingThemeToggleEnabled: boolean;
  sidebarLayout: string;
}

export interface AuthenticatedUser {
  id: string;

  companyId: string;

  /** Raiz do grupo (Company.rootCompanyId ?? companyId) — dono dos cadastros compartilhados do grupo ("Interprise"). */
  rootCompanyId: string;

  email: string;

  name: string;

  status: string;

  avatar: string | null;

  avatarEnabled: boolean;

  permissions: AuthenticatedPermission[];

  modules: AuthenticatedModule[];

  company: AuthenticatedCompany;
}
