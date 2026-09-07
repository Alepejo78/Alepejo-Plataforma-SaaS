import { forwardRef, Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentMethodSettingsModule } from '../payment-method-settings/payment-method-settings.module';
import { FinancialEntriesModule } from '../financial-entries/financial-entries.module';

import { EntryChargeWebhookController } from './controllers/entry-charge-webhook.controller';
import { EntryChargeService } from './services/entry-charge.service';

@Module({
  imports: [
    PrismaModule,
    BillingModule,
    NotificationsModule,
    PaymentMethodSettingsModule,
    forwardRef(() => FinancialEntriesModule),
  ],

  controllers: [EntryChargeWebhookController],

  providers: [EntryChargeService],

  exports: [EntryChargeService],
})
export class EntryChargesModule {}
