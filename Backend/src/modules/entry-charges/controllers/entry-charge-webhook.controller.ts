import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../core/decorators/public.decorator';
import { PaymentMethodSettingsRepository } from '../../payment-method-settings/repositories/payment-method-settings.repository';

import { EntryChargeService } from '../services/entry-charge.service';

@ApiTags('Entry Charges')
@Controller('entry-charges/webhook')
export class EntryChargeWebhookController {
  private readonly logger = new Logger(EntryChargeWebhookController.name);

  constructor(
    private readonly service: EntryChargeService,
    private readonly settingsRepository: PaymentMethodSettingsRepository,
  ) {}

  /**
   * Uma URL por empresa (o `companyId` já vai na URL) — cada empresa
   * cola essa URL + o próprio `asaasWebhookToken` na configuração de
   * webhook da conta Asaas dela. Público por natureza (o Asaas chama
   * de fora), protegido pelo header `asaas-access-token` comparado
   * com o token daquela empresa específica.
   */
  @Public()
  @Post('asaas/:companyId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook de eventos de pagamento do Asaas (por empresa)' })
  async webhook(
    @Param('companyId') companyId: string,
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: { id?: string; event: string; payment?: { id: string } },
  ) {
    const settings = await this.settingsRepository.getOrCreate(companyId);
    const token = headers['asaas-access-token'];

    if (
      !settings.asaasWebhookToken ||
      !token ||
      token !== settings.asaasWebhookToken
    ) {
      this.logger.warn(
        `Webhook recusado (401) pra empresa ${companyId}.`,
      );

      throw new UnauthorizedException('Token de webhook inválido.');
    }

    return this.service.handleWebhook(companyId, body);
  }
}
