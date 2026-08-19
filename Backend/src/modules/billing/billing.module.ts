import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { BillingController } from './controllers/billing.controller';
import { BillingService } from './services/billing.service';
import { AsaasService } from './services/asaas.service';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [BillingService, AsaasService],
})
export class BillingModule {}
