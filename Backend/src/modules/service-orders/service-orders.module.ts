import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { LicenseModule } from '../identity/license/license.module';
import { BusinessPartnersModule } from '../business-partners/business-partners.module';
import { DocumentSequenceModule } from '../../core/document-sequence/document-sequence.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InAppNotificationsModule } from '../in-app-notifications/in-app-notifications.module';
import { SalesOrdersModule } from '../sales-orders/sales-orders.module';

import { ServiceOrderController } from './controllers/service-order.controller';
import { ServiceOrderRepository } from './repositories/service-order.repository';
import { ServiceOrderService } from './services/service-order.service';
import { ServiceOrderPdfService } from './services/service-order-pdf.service';
import { ServiceOrderConfirmationService } from './services/service-order-confirmation.service';

@Module({
  imports: [
    PrismaModule,
    LicenseModule,
    BusinessPartnersModule,
    DocumentSequenceModule,
    NotificationsModule,
    InAppNotificationsModule,
    SalesOrdersModule,
  ],

  controllers: [ServiceOrderController],

  providers: [
    ServiceOrderRepository,
    ServiceOrderService,
    ServiceOrderPdfService,
    ServiceOrderConfirmationService,
  ],

  exports: [ServiceOrderRepository, ServiceOrderService],
})
export class ServiceOrdersModule {}
