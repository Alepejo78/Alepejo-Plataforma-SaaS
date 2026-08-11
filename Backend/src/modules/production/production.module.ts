import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { LicenseModule } from '../identity/license/license.module';
import { DocumentSequenceModule } from '../../core/document-sequence/document-sequence.module';

import { ProductionOrderController } from './controllers/production-order.controller';
import { ProductionSettingsController } from './controllers/production-settings.controller';
import { ProductionOrderRepository } from './repositories/production-order.repository';
import { ProductionSettingsRepository } from './repositories/production-settings.repository';
import { ProductionOrdersService } from './services/production-orders.service';

@Module({
  imports: [PrismaModule, LicenseModule, DocumentSequenceModule],

  controllers: [
    ProductionOrderController,
    ProductionSettingsController,
  ],

  providers: [
    ProductionOrderRepository,
    ProductionSettingsRepository,
    ProductionOrdersService,
  ],

  exports: [ProductionOrdersService],
})
export class ProductionModule {}
