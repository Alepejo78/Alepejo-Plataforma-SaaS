import { Module } from '@nestjs/common';

import { EmailNotificationsService } from './services/email-notifications.service';
import { WhatsappNotificationsService } from './services/whatsapp-notifications.service';
import { WhatsappNotificationsController } from './controllers/whatsapp-notifications.controller';

@Module({
  controllers: [WhatsappNotificationsController],
  providers: [
    EmailNotificationsService,
    WhatsappNotificationsService,
  ],
  exports: [
    EmailNotificationsService,
    WhatsappNotificationsService,
  ],
})
export class NotificationsModule {}
