import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { WorkSchedulesController } from './controllers/work-schedules.controller';
import { WorkSchedulesService } from './services/work-schedules.service';
import { WorkSchedulesRepository } from './repositories/work-schedules.repository';

@Module({
  imports: [PrismaModule],
  controllers: [WorkSchedulesController],
  providers: [WorkSchedulesService, WorkSchedulesRepository],
  exports: [WorkSchedulesService, WorkSchedulesRepository],
})
export class WorkSchedulesModule {}
