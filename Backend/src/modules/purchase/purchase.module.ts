import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { PurchaseController } from './controllers/purchase.controller';

import { PurchaseRepository } from './repositories/purchase.repository';

import { PurchaseService } from './services/purchase.service';

@Module({
  imports: [
    PrismaModule,
  ],

  controllers: [
    PurchaseController,
  ],

  providers: [
    PurchaseRepository,
    PurchaseService,
  ],

  exports: [
    PurchaseRepository,
    PurchaseService,
  ],
})
export class PurchaseModule {}