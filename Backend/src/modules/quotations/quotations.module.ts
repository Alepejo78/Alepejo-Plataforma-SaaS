import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { LicenseModule } from '../identity/license/license.module';
import { BusinessPartnersModule } from '../business-partners/business-partners.module';
import { DocumentSequenceModule } from '../../core/document-sequence/document-sequence.module';

import { QuotationController } from './controllers/quotation.controller';
import { QuotationRepository } from './repositories/quotation.repository';
import { QuotationService } from './services/quotation.service';

@Module({
  imports: [
    PrismaModule,
    LicenseModule,
    BusinessPartnersModule,
    DocumentSequenceModule,
  ],

  controllers: [QuotationController],

  providers: [QuotationRepository, QuotationService],

  exports: [QuotationRepository, QuotationService],
})
export class QuotationsModule {}
