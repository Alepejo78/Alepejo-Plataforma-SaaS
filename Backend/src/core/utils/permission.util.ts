import {
  AuthenticatedPermission,
  AuthenticatedUser,
  PermissionEffect,
} from '../../modules/identity/auth/interfaces/authenticated-user.interface';

/**
 * Mesma regra de precedência do `PermissionsGuard`: DENY sempre vence,
 * mesmo vindo de outro perfil. Usado fora do pipeline HTTP (dentro de
 * um service, decidindo o QUE consultar) — não dá pra usar o
 * decorator `@Permissions` nesses casos.
 */
export function hasPermission(
  user: AuthenticatedUser,
  code: string,
): boolean {
  const entries: AuthenticatedPermission[] = Array.isArray(
    user.permissions,
  )
    ? user.permissions.filter((p) => p.code === code)
    : [];

  if (entries.length === 0) {
    return false;
  }

  return !entries.some((p) => p.effect === PermissionEffect.DENY);
}
