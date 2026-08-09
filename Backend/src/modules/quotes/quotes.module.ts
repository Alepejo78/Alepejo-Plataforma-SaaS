import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { LicenseModule } from '../identity/license/license.module';
import { BusinessPartnersModule } from '../business-partners/business-partners.module';
import { DocumentSequenceModule } from '../../core/document-sequence/document-sequence.module';

import { QuoteController } from './controllers/quote.controller';
import { QuoteRepository } from './repositories/quote.repository';
import { QuoteService } from './services/quote.service';

@Module({
  imports: [
    PrismaModule,
    LicenseModule,
    BusinessPartnersModule,
    DocumentSequenceModule,
  ],

  controllers: [QuoteController],

  providers: [QuoteRepository, QuoteService],

  exports: [QuoteRepository, QuoteService],
})
export class QuotesModule {}
