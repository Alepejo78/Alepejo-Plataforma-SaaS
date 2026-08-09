import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { PpeDeliveriesController } from './controllers/ppe-deliveries.controller';
import { PpeDeliveriesService } from './services/ppe-deliveries.service';
import { PpeDeliveriesRepository } from './repositories/ppe-deliveries.repository';

@Module({
  imports: [PrismaModule],
  controllers: [PpeDeliveriesController],
  providers: [PpeDeliveriesService, PpeDeliveriesRepository],
  exports: [PpeDeliveriesService, PpeDeliveriesRepository],
})
export class PpeDeliveriesModule {}
