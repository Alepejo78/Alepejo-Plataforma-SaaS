import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { TimeClockApiKeyService } from '../services/time-clock-api-key.service';

/**
 * Autentica dispositivos externos (relógio de ponto, leitor de QR/
 * código de barras) pelo header `X-Api-Key` — sem login, não passa
 * pelo JwtAuthGuard (rota marcada @Public()). Anexa `companyId`
 * resolvido no request pro controller usar.
 */
@Injectable()
export class TimeClockApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeyService: TimeClockApiKeyService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const apiKey = request.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException(
        'Chave de API não informada (header X-Api-Key).',
      );
    }

    const companyId =
      await this.apiKeyService.resolveCompanyId(apiKey);

    if (!companyId) {
      throw new UnauthorizedException('Chave de API inválida.');
    }

    request.timeClockCompanyId = companyId;

    return true;
  }
}
