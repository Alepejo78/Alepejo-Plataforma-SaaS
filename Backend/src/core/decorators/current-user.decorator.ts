import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../../modules/identity/auth/interfaces/authenticated-user.interface';

/**
 * Extrai o usuário autenticado (populado pelo JwtStrategy) do request.
 *
 * Uso: @CurrentUser() user: AuthenticatedUser
 * ou:  @CurrentUser('companyId') companyId: string
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    return data ? user?.[data] : user;
  },
);
