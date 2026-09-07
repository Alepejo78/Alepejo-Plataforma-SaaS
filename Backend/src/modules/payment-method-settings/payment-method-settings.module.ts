import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { LicenseModule } from '../identity/license/license.module';
import { BillingModule } from '../billing/billing.module';

import { PaymentMethodSettingsController } from './controllers/payment-method-settings.controller';
import { PaymentMethodSettingsRepository } from './repositories/payment-method-settings.repository';
import { PaymentMethodSettingsService } from './services/payment-method-settings.service';

@Module({
  imports: [PrismaModule, LicenseModule, BillingModule],

  controllers: [PaymentMethodSettingsController],

  providers: [PaymentMethodSettingsRepository, PaymentMethodSettingsService],

  exports: [PaymentMethodSettingsService, PaymentMethodSettingsRepository],
})
export class PaymentMethodSettingsModule {}
