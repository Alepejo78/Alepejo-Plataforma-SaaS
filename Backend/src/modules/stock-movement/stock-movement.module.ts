import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { ProductionModule } from '../production/production.module';

import { StockMovementController } from './controllers/stock-movement.controller';

import { StockMovementRepository } from './repositories/stock-movement.repository';

import { StockMovementService } from './services/stock-movement.service';

@Module({
  imports: [PrismaModule, ProductionModule],

  controllers: [
    StockMovementController,
  ],

  providers: [
    StockMovementRepository,
    StockMovementService,
  ],

  exports: [
    StockMovementRepository,
    StockMovementService,
  ],
})
export class StockMovementModule {}