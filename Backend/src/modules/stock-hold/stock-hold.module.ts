import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { LicenseModule } from '../identity/license/license.module';

import { StockHoldController } from './controllers/stock-hold.controller';
import { StockHoldRepository } from './repositories/stock-hold.repository';
import { StockHoldService } from './services/stock-hold.service';

@Module({
  imports: [PrismaModule, LicenseModule],

  controllers: [StockHoldController],

  providers: [StockHoldRepository, StockHoldService],

  exports: [StockHoldRepository, StockHoldService],
})
export class StockHoldModule {}
