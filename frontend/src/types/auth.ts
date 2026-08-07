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

export interface AuthCompany {
  id: string;
  code: string;
  legalName: string;
  tradeName: string;
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
  permissions: AuthPermission[];
  modules: AuthModule[];
  company: AuthCompany;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
