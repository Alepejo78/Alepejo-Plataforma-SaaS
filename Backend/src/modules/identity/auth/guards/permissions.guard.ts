import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../../../../core/decorators/public.decorator';
import {
  AuthenticatedPermission,
  AuthenticatedUser,
  PermissionEffect,
} from '../interfaces/authenticated-user.interface';

/**
 * Permissões de administração da PLATAFORMA (não da empresa do
 * cliente) — mesmo que alguém conceda essa permissão pela matriz de
 * perfis de acesso, só a conta do dono pode efetivamente usá-la.
 */
const PLATFORM_OWNER_ONLY_PERMISSIONS = new Set([
  'platform.license.manage',
  'platform.company.delete',
  'platform.cbo.manage',
]);
const PLATFORM_OWNER_EMAIL = 'alessandro.lourenco@alepejo.com.br';

/**
 * Responsável SOMENTE por checar permissões (RBAC).
 * A checagem de licença/módulo contratado é feita pelo LicenseGuard
 * (identity/license/guards/license.guard.ts) — não duplicar aqui.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    const userPermissions: AuthenticatedPermission[] = Array.isArray(
      user.permissions,
    )
      ? user.permissions
      : [];

    const isGranted = (code: string): boolean => {
      if (
        PLATFORM_OWNER_ONLY_PERMISSIONS.has(code) &&
        user.email?.toLowerCase() !== PLATFORM_OWNER_EMAIL
      ) {
        return false;
      }

      const entries = userPermissions.filter((p) => p.code === code);

      if (entries.length === 0) {
        return false;
      }

      // DENY sempre tem prioridade sobre ALLOW, mesmo vindo de outro perfil.
      const hasDeny = entries.some(
        (p) => p.effect === PermissionEffect.DENY,
      );

      return !hasDeny;
    };

    const authorized = requiredPermissions.every((permission) =>
      isGranted(permission),
    );

    if (!authorized) {
      throw new ForbiddenException(
        'Você não possui permissão para executar esta operação.',
      );
    }

    return true;
  }
}
