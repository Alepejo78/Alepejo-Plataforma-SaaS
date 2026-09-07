import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { PaymentMethodSettingsService } from '../services/payment-method-settings.service';

import { UpsertPaymentMethodSettingsDto } from '../dto/upsert-payment-method-settings.dto';
import { TestAsaasConnectionDto } from '../dto/test-asaas-connection.dto';

@ApiTags('Payment Method Settings')
@Controller('payment-method-settings')
@Module('FINANCE')
export class PaymentMethodSettingsController {
  constructor(private readonly service: PaymentMethodSettingsService) {}

  @Get()
  @Permissions('payment-method-settings.view')
  @ApiOperation({ summary: 'Minhas configurações de formas de pagamento' })
  getMine(@CurrentUser('companyId') companyId: string) {
    return this.service.getSettings(companyId);
  }

  @Put()
  @Permissions('payment-method-settings.manage')
  @ApiOperation({ summary: 'Alterar configurações de formas de pagamento' })
  updateMine(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpsertPaymentMethodSettingsDto,
  ) {
    return this.service.updateSettings(companyId, dto);
  }

  @Post('regenerate-webhook-token')
  @Permissions('payment-method-settings.manage')
  @ApiOperation({ summary: 'Gera um novo token de webhook (invalida o anterior)' })
  regenerateWebhookToken(@CurrentUser('companyId') companyId: string) {
    return this.service.regenerateWebhookToken(companyId);
  }

  @Post('test-asaas')
  @Permissions('payment-method-settings.manage')
  @ApiOperation({ summary: 'Testa a conexão com o Asaas' })
  testAsaas(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: TestAsaasConnectionDto,
  ) {
    return this.service.testAsaasConnection(companyId, dto);
  }
}
