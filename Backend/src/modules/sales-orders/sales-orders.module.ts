import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { LicenseModule } from '../identity/license/license.module';
import { BusinessPartnersModule } from '../business-partners/business-partners.module';
import { DocumentSequenceModule } from '../../core/document-sequence/document-sequence.module';

import { SalesOrderController } from './controllers/sales-order.controller';
import { SalesOrderRepository } from './repositories/sales-order.repository';
import { SalesOrderService } from './services/sales-order.service';

@Module({
  imports: [
    PrismaModule,
    LicenseModule,
    BusinessPartnersModule,
    DocumentSequenceModule,
  ],

  controllers: [SalesOrderController],

  providers: [SalesOrderRepository, SalesOrderService],

  exports: [SalesOrderRepository, SalesOrderService],
})
export class SalesOrdersModule {}
