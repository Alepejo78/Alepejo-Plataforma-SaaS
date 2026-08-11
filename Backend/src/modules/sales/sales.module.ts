import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { LicenseModule } from '../identity/license/license.module';
import { BusinessPartnersModule } from '../business-partners/business-partners.module';
import { FinancialEntriesModule } from '../financial-entries/financial-entries.module';
import { DocumentSequenceModule } from '../../core/document-sequence/document-sequence.module';
import { ProductionModule } from '../production/production.module';

import { SaleController } from './controllers/sale.controller';
import { SaleRepository } from './repositories/sale.repository';
import { SaleService } from './services/sale.service';

@Module({
  imports: [
    PrismaModule,
    LicenseModule,
    BusinessPartnersModule,
    FinancialEntriesModule,
    DocumentSequenceModule,
    ProductionModule,
  ],

  controllers: [
    SaleController,
  ],

  providers: [
    SaleRepository,
    SaleService,
  ],

  exports: [
    SaleRepository,
    SaleService,
  ],
})
export class SalesModule {}