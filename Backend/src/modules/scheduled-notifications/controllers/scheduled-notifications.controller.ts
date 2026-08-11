import { Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../../identity/auth/decorators/permissions.decorator';

import { ScheduledNotificationsService } from '../services/scheduled-notifications.service';

/**
 * Disparo manual dos avisos diários (exame ocupacional/aniversário) —
 * útil pra testar sem esperar o horário do cron (8h, ver
 * ScheduledNotificationsService.runDailyNotifications). Roda para
 * todas as empresas do sistema, não é escopado por companyId.
 */
@ApiTags('Scheduled Notifications')
@Controller('scheduled-notifications')
export class ScheduledNotificationsController {
  constructor(
    private readonly service: ScheduledNotificationsService,
  ) {}

  @Post('run')
  @Permissions('scheduled-notifications.manage')
  @ApiOperation({
    summary: 'Rodar agora os avisos diários de exame/aniversário (fora do horário do cron)',
  })
  async run() {
    await this.service.runDailyNotifications();

    return { ok: true };
  }
}
