import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { LicenseModule } from '../identity/license/license.module';
import { InAppNotificationsModule } from '../in-app-notifications/in-app-notifications.module';

import { ProductsController } from './controllers/products.controller';
import { ProductsService } from './services/products.service';
import { ProductsRepository } from './repositories/products.repository';

@Module({
  imports: [
    PrismaModule,
    LicenseModule,
    InAppNotificationsModule,
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