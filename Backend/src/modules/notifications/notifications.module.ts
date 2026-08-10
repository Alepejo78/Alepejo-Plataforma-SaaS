import { Module } from '@nestjs/common';

import { EmailNotificationsService } from './services/email-notifications.service';

@Module({
  providers: [EmailNotificationsService],
  exports: [EmailNotificationsService],
})
export class NotificationsModule {}
