import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { ScheduledNotificationsController } from './controllers/scheduled-notifications.controller';
import { ScheduledNotificationsService } from './services/scheduled-notifications.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [ScheduledNotificationsController],
  providers: [ScheduledNotificationsService],
})
export class ScheduledNotificationsModule {}
