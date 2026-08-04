import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { InventoryController } from './controllers/inventory.controller';
import { InventoryRepository } from './repositories/inventory.repository';
import { InventoryService } from './services/inventory.service';

@Module({
  imports: [PrismaModule],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventoryRepository,
  ],
  exports: [
    InventoryService,
    InventoryRepository,
  ],
})
export class InventoryModule {}