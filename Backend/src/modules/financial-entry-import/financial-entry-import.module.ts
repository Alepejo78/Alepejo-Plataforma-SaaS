import { Module } from '@nestjs/common';

import { LicenseModule } from '../identity/license/license.module';
import { FinancialEntriesModule } from '../financial-entries/financial-entries.module';
import { BusinessPartnersModule } from '../business-partners/business-partners.module';
import { ProductsModule } from '../products/products.module';
import { ChartOfAccountsModule } from '../chart-of-accounts/chart-of-accounts.module';

import { FinancialEntryImportController } from './controllers/financial-entry-import.controller';
import { FinancialEntryImportService } from './services/financial-entry-import.service';

@Module({
  imports: [
    LicenseModule,
    FinancialEntriesModule,
    BusinessPartnersModule,
    ProductsModule,
    ChartOfAccountsModule,
  ],
  controllers: [FinancialEntryImportController],
  providers: [FinancialEntryImportService],
})
export class FinancialEntryImportModule {}
