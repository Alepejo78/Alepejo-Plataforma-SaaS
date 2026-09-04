import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { LicenseModule } from '../identity/license/license.module';

import { PaymentReminderSettingsController } from './controllers/payment-reminder-settings.controller';
import { PaymentReminderSettingsRepository } from './repositories/payment-reminder-settings.repository';
import { PaymentReminderSettingsService } from './services/payment-reminder-settings.service';

@Module({
  imports: [PrismaModule, LicenseModule],

  controllers: [PaymentReminderSettingsController],

  providers: [PaymentReminderSettingsRepository, PaymentReminderSettingsService],

  exports: [PaymentReminderSettingsService],
})
export class PaymentReminderSettingsModule {}
