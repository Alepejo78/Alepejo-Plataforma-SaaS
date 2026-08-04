import { PermissionEffect } from '@prisma/client';

export { PermissionEffect };

export interface AuthenticatedPermission {
  code: string;
  effect: PermissionEffect;
}

export interface AuthenticatedUser {
  id: string;

  companyId: string;

  email: string;

  name: string;

  status: string;

  permissions: AuthenticatedPermission[];
}
