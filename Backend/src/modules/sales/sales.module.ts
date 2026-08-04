import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { SaleController } from './controllers/sale.controller';
import { SaleRepository } from './repositories/sale.repository';
import { SaleService } from './services/sale.service';

@Module({
  imports: [PrismaModule],

  controllers: [SaleController],

  providers: [
    SaleRepository,
    SaleService,
  ],

  exports: [
    SaleRepository,
    SaleService,
  ],
})
export class SalesModule {}