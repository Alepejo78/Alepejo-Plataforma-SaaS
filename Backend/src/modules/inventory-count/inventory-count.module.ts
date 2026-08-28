import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { LicenseModule } from '../identity/license/license.module';
import { DocumentSequenceModule } from '../../core/document-sequence/document-sequence.module';

import { InventoryCountController } from './controllers/inventory-count.controller';
import { InventoryCountRepository } from './repositories/inventory-count.repository';
import { InventoryCountService } from './services/inventory-count.service';

@Module({
  imports: [PrismaModule, LicenseModule, DocumentSequenceModule],
  controllers: [InventoryCountController],
  providers: [InventoryCountRepository, InventoryCountService],
  exports: [InventoryCountRepository, InventoryCountService],
})
export class InventoryCountModule {}
