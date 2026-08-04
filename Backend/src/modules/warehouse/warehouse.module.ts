import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { WarehouseController } from './controllers/warehouse.controller';
import { WarehouseRepository } from './repositories/warehouse.repository';
import { WarehouseService } from './services/warehouse.service';

@Module({
  imports: [PrismaModule],
  controllers: [WarehouseController],
  providers: [
    WarehouseRepository,
    WarehouseService,
  ],
  exports: [
    WarehouseRepository,
    WarehouseService,
  ],
})
export class WarehouseModule {}