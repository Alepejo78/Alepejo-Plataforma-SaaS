import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Permissions } from '../../identity/auth/decorators/permissions.decorator';

import { ScheduledNotificationSettingsService } from '../services/scheduled-notification-settings.service';

import { UpsertScheduledNotificationSettingsDto } from '../dto/upsert-scheduled-notification-settings.dto';

/**
 * Sem `@Module()` de propósito — Avisos Automáticos não é um recurso
 * de um módulo licenciado só (mistura RH, Financeiro etc.), fica
 * disponível pra quem tiver a permissão, independente do plano.
 */
@ApiTags('Scheduled Notification Settings')
@Controller('scheduled-notification-settings')
export class ScheduledNotificationSettingsController {
  constructor(
    private readonly service: ScheduledNotificationSettingsService,
  ) {}

  @Get()
  @Permissions('scheduled-notifications.manage')
  @ApiOperation({ summary: 'Minhas configurações de avisos automáticos' })
  getMine(@CurrentUser('companyId') companyId: string) {
    return this.service.getSettings(companyId);
  }

  @Put()
  @Permissions('scheduled-notifications.manage')
  @ApiOperation({ summary: 'Alterar configurações de avisos automáticos' })
  updateMine(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpsertScheduledNotificationSettingsDto,
  ) {
    return this.service.updateSettings(companyId, dto);
  }
}
