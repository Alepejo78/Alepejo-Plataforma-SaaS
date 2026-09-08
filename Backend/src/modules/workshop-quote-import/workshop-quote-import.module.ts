import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { BusinessPartnersModule } from '../business-partners/business-partners.module';
import { ProductsModule } from '../products/products.module';
import { UnitsOfMeasureModule } from '../units-of-measure/units-of-measure.module';
import { ChartOfAccountsModule } from '../chart-of-accounts/chart-of-accounts.module';
import { FinancialEntriesModule } from '../financial-entries/financial-entries.module';

import { WorkshopQuoteImportController } from './controllers/workshop-quote-import.controller';
import { WorkshopQuoteImportService } from './services/workshop-quote-import.service';
import { WorkshopQuotePdfParserService } from './services/workshop-quote-pdf-parser.service';
import { DocumentTextExtractorService } from '../invoice-import/services/document-text-extractor.service';

@Module({
  imports: [
    PrismaModule,
    BusinessPartnersModule,
    ProductsModule,
    UnitsOfMeasureModule,
    ChartOfAccountsModule,
    FinancialEntriesModule,
  ],
  controllers: [WorkshopQuoteImportController],
  providers: [
    WorkshopQuoteImportService,
    WorkshopQuotePdfParserService,
    DocumentTextExtractorService,
  ],
})
export class WorkshopQuoteImportModule {}
