import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { MODULE_KEY } from '../decorators/module.decorator';
import { IS_PUBLIC_KEY } from '../../../../core/decorators/public.decorator';
import { LicenseService } from '../services/license.service';

/**
 * Valida se o módulo exigido pela rota está licenciado para a empresa
 * do usuário autenticado.
 *
 * A consulta é feita no banco a cada request (e não no snapshot gravado
 * no JWT) para que revogação/expiração de licença tenha efeito imediato,
 * sem depender da reemissão do token.
 */
@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly licenseService: LicenseService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    // IMPORTANTE: usar getAllAndOverride com [handler, class].
    // Com reflector.get(..., getHandler()) o decorator @Module()
    // aplicado no CONTROLLER (nível de classe) era ignorado, e a
    // checagem de licença nunca era executada.
    const moduleCode = this.reflector.getAllAndOverride<string>(
      MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!moduleCode) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const companyId = request.user?.companyId;

    if (!companyId) {
      throw new ForbiddenException(
        'Empresa não identificada.',
      );
    }

    const licensed = await this.licenseService.hasModule(
      companyId,
      moduleCode,
    );

    if (!licensed) {
      throw new ForbiddenException(
        'Este módulo não está licenciado para sua empresa.',
      );
    }

    return true;
  }
}
