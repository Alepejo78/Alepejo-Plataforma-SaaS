import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { LicenseModule } from '../identity/license/license.module';

import { ProductsController } from './controllers/products.controller';
import { ProductsService } from './services/products.service';
import { ProductsRepository } from './repositories/products.repository';

@Module({
  imports: [
    PrismaModule,
    LicenseModule,
  ],

  controllers: [
    ProductsController,
  ],

  providers: [
    ProductsService,
    ProductsRepository,
  ],

  exports: [
    ProductsService,
    ProductsRepository,
  ],
})
export class ProductsModule {}