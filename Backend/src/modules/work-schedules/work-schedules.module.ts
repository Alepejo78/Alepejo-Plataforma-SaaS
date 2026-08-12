import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { WorkSchedulesController } from './controllers/work-schedules.controller';
import { WorkSchedulesService } from './services/work-schedules.service';
import { WorkSchedulesRepository } from './repositories/work-schedules.repository';

import { WorkScheduleShiftsController } from './controllers/work-schedule-shifts.controller';
import { WorkScheduleShiftsService } from './services/work-schedule-shifts.service';
import { WorkScheduleShiftRepository } from './repositories/work-schedule-shift.repository';

@Module({
  imports: [PrismaModule],
  controllers: [
    WorkSchedulesController,
    WorkScheduleShiftsController,
  ],
  providers: [
    WorkSchedulesService,
    WorkSchedulesRepository,
    WorkScheduleShiftsService,
    WorkScheduleShiftRepository,
  ],
  exports: [
    WorkSchedulesService,
    WorkSchedulesRepository,
    WorkScheduleShiftRepository,
  ],
})
export class WorkSchedulesModule {}
