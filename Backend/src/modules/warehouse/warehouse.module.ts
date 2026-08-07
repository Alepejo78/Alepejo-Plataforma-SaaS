import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { WarehouseController } from './controllers/warehouse.controller';
import { WarehouseRepository } from './repositories/warehouse.repository';
import { WarehouseService } from './services/warehouse.service';

import { LicenseModule } from '../identity/license/license.module';

@Module({
  imports: [
    PrismaModule,
    LicenseModule,
  ],

  controllers: [
    WarehouseController,
  ],

  providers: [
    WarehouseService,
    WarehouseRepository,
  ],

  exports: [
    WarehouseService,
    WarehouseRepository,
  ],
})
export class WarehouseModule {}