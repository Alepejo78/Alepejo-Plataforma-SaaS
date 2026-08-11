import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { LicenseModule } from '../identity/license/license.module';
import { BusinessPartnersModule } from '../business-partners/business-partners.module';
import { DocumentSequenceModule } from '../../core/document-sequence/document-sequence.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { PurchaseOrderController } from './controllers/purchase-order.controller';
import { PurchaseOrderRepository } from './repositories/purchase-order.repository';
import { PurchaseOrderService } from './services/purchase-order.service';

@Module({
  imports: [
    PrismaModule,
    LicenseModule,
    BusinessPartnersModule,
    DocumentSequenceModule,
    NotificationsModule,
  ],

  controllers: [PurchaseOrderController],

  providers: [PurchaseOrderRepository, PurchaseOrderService],

  exports: [PurchaseOrderRepository, PurchaseOrderService],
})
export class PurchaseOrdersModule {}
