import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { EmailNotificationsService } from './services/email-notifications.service';
import { WhatsappNotificationsService } from './services/whatsapp-notifications.service';
import { WhatsappNotificationsController } from './controllers/whatsapp-notifications.controller';
import { EmailSettingsController } from './controllers/email-settings.controller';
import { EmailSettingsService } from './services/email-settings.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    WhatsappNotificationsController,
    EmailSettingsController,
  ],
  providers: [
    EmailNotificationsService,
    WhatsappNotificationsService,
    EmailSettingsService,
  ],
  exports: [
    EmailNotificationsService,
    WhatsappNotificationsService,
  ],
})
export class NotificationsModule {}
