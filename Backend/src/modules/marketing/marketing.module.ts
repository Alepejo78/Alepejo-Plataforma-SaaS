import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { ContactController } from './controllers/contact.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [ContactController],
})
export class MarketingModule {}
