import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { ProductCategoriesController } from './controllers/product-categories.controller';
import { ProductCategoriesService } from './services/product-categories.service';
import { ProductCategoriesRepository } from './repositories/product-categories.repository';

@Module({
  imports: [PrismaModule],
  controllers: [ProductCategoriesController],
  providers: [
    ProductCategoriesService,
    ProductCategoriesRepository,
  ],
  exports: [
    ProductCategoriesService,
    ProductCategoriesRepository,
  ],
})
export class ProductCategoriesModule {}