import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { LicenseModule } from '../identity/license/license.module';
import { BusinessPartnersModule } from '../business-partners/business-partners.module';
import { DocumentSequenceModule } from '../../core/document-sequence/document-sequence.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InAppNotificationsModule } from '../in-app-notifications/in-app-notifications.module';
import { SalesOrdersModule } from '../sales-orders/sales-orders.module';
import { SalesSettingsModule } from '../sales-settings/sales-settings.module';

import { QuoteController } from './controllers/quote.controller';
import { QuoteRepository } from './repositories/quote.repository';
import { QuoteService } from './services/quote.service';
import { QuotePdfService } from './services/quote-pdf.service';
import { QuoteConfirmationService } from './services/quote-confirmation.service';

@Module({
  imports: [
    PrismaModule,
    LicenseModule,
    BusinessPartnersModule,
    DocumentSequenceModule,
    NotificationsModule,
    InAppNotificationsModule,
    SalesOrdersModule,
    SalesSettingsModule,
  ],

  controllers: [QuoteController],

  providers: [
    QuoteRepository,
    QuoteService,
    QuotePdfService,
    QuoteConfirmationService,
  ],

  exports: [QuoteRepository, QuoteService],
})
export class QuotesModule {}
