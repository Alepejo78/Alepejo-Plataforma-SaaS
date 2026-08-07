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
}

export interface AuthenticatedUser {
  id: string;

  companyId: string;

  email: string;

  name: string;

  status: string;

  permissions: AuthenticatedPermission[];

  modules: AuthenticatedModule[];

  company: AuthenticatedCompany;
}
