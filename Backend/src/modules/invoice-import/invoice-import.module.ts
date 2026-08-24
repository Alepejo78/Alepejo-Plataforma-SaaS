import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { LicenseModule } from '../identity/license/license.module';
import { BusinessPartnersModule } from '../business-partners/business-partners.module';
import { FinancialEntriesModule } from '../financial-entries/financial-entries.module';
import { PurchaseModule } from '../purchase/purchase.module';
import { SalesModule } from '../sales/sales.module';

import { InvoiceImportController } from './controllers/invoice-import.controller';
import { InvoiceImportService } from './services/invoice-import.service';
import { InvoiceXmlParserService } from './services/invoice-xml-parser.service';

@Module({
  imports: [
    PrismaModule,
    LicenseModule,
    BusinessPartnersModule,
    FinancialEntriesModule,
    PurchaseModule,
    SalesModule,
  ],

  controllers: [InvoiceImportController],

  providers: [InvoiceImportService, InvoiceXmlParserService],
})
export class InvoiceImportModule {}
