import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';
import { Module } from '../../identity/license/decorators/module.decorator';

import { PaymentReminderSettingsService } from '../services/payment-reminder-settings.service';

import { UpsertPaymentReminderSettingsDto } from '../dto/upsert-payment-reminder-settings.dto';

@ApiTags('Payment Reminder Settings')
@Controller('payment-reminder-settings')
@Module('FINANCE')
export class PaymentReminderSettingsController {
  constructor(private readonly service: PaymentReminderSettingsService) {}

  @Get()
  @Permissions('payment-reminder-settings.view')
  @ApiOperation({ summary: 'Minhas configurações de lembrete de vencimento' })
  getMine(@CurrentUser('companyId') companyId: string) {
    return this.service.getSettings(companyId);
  }

  @Put()
  @Permissions('payment-reminder-settings.manage')
  @ApiOperation({ summary: 'Alterar configurações de lembrete de vencimento' })
  updateMine(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpsertPaymentReminderSettingsDto,
  ) {
    return this.service.updateSettings(companyId, dto);
  }
}
