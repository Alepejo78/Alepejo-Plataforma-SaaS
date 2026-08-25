import { Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../identity/auth/interfaces/authenticated-user.interface';

import { InAppNotificationsService } from '../services/in-app-notifications.service';

@ApiTags('Notificações')
@Controller('notifications')
export class InAppNotificationsController {
  constructor(private readonly service: InAppNotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Notificações não lidas do sino, visíveis pro usuário logado.',
  })
  listUnread(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listUnread(user);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Marca uma notificação como lida — some do sino.',
  })
  markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.markAsRead(user, id);
  }
}
