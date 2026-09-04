import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { LicenseModule } from '../identity/license/license.module';

import { ProductsModule } from '../products/products.module';
import { ProductCategoriesModule } from '../product-categories/product-categories.module';
import { BrandsModule } from '../brands/brands.module';
import { UnitsOfMeasureModule } from '../units-of-measure/units-of-measure.module';
import { ChartOfAccountsModule } from '../chart-of-accounts/chart-of-accounts.module';

import { ProductImportController } from './controllers/product-import.controller';
import { ProductImportService } from './services/product-import.service';

@Module({
  imports: [
    PrismaModule,
    LicenseModule,
    ProductsModule,
    ProductCategoriesModule,
    BrandsModule,
    UnitsOfMeasureModule,
    ChartOfAccountsModule,
  ],
  controllers: [ProductImportController],
  providers: [ProductImportService],
})
export class ProductImportModule {}
