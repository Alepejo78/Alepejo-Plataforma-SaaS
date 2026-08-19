import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../core/decorators/public.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';

import { BillingService } from '../services/billing.service';
import { SubscribeDto } from '../dto/subscribe.dto';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('me/subscribe')
  @Permissions('license.view')
  @ApiOperation({
    summary:
      'Contratar/regularizar a assinatura da minha empresa no Asaas',
  })
  subscribe(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: SubscribeDto,
  ) {
    return this.billingService.subscribe(companyId, dto.billingType);
  }

  @Get('customers')
  @Permissions('platform.license.manage')
  @ApiOperation({
    summary: 'Relatório de clientes e faturamento (plataforma) — 12 meses de um ano',
  })
  customers(@Query('year') year?: string) {
    const parsed = year ? Number(year) : NaN;
    const resolvedYear =
      Number.isInteger(parsed) && parsed > 2000
        ? parsed
        : new Date().getFullYear();

    return this.billingService.customerReport(resolvedYear);
  }

  /**
   * Pública por natureza (o Asaas chama de fora), mas protegida pelo
   * header `asaas-access-token` — sem ele (ou errado), 401. É a única
   * autenticação possível aqui: não existe sessão de usuário num
   * webhook servidor-a-servidor.
   */
  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook de eventos de pagamento do Asaas' })
  webhook(
    @Headers('asaas-access-token') token: string | undefined,
    @Body() body: { id?: string; event: string; payment?: { id: string } },
  ) {
    const expected = process.env.ASAAS_WEBHOOK_TOKEN;

    if (!expected || !token || token !== expected) {
      throw new UnauthorizedException('Token de webhook inválido.');
    }

    return this.billingService.handleWebhook(body);
  }
}
