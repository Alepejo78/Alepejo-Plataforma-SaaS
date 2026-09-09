import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { ScheduledNotificationSettingsController } from './controllers/scheduled-notification-settings.controller';
import { ScheduledNotificationSettingsRepository } from './repositories/scheduled-notification-settings.repository';
import { ScheduledNotificationSettingsService } from './services/scheduled-notification-settings.service';

@Module({
  imports: [PrismaModule],

  controllers: [ScheduledNotificationSettingsController],

  providers: [
    ScheduledNotificationSettingsRepository,
    ScheduledNotificationSettingsService,
  ],

  exports: [ScheduledNotificationSettingsService],
})
export class ScheduledNotificationSettingsModule {}
