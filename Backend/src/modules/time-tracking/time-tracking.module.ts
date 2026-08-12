import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { LicenseModule } from '../identity/license/license.module';

import { TimeEntryController } from './controllers/time-entry.controller';
import { AbsenceRecordController } from './controllers/absence-record.controller';
import { TimeClockPunchController } from './controllers/time-clock-punch.controller';
import { TimeClockApiKeyController } from './controllers/time-clock-api-key.controller';

import { TimeEntryRepository } from './repositories/time-entry.repository';
import { TimeSheetApprovalRepository } from './repositories/time-sheet-approval.repository';
import { TimeEntryAdjustmentRepository } from './repositories/time-entry-adjustment.repository';
import { AbsenceRecordRepository } from './repositories/absence-record.repository';

import { TimeTrackingService } from './services/time-tracking.service';
import { AbsenceService } from './services/absence.service';
import { TimeClockApiKeyService } from './services/time-clock-api-key.service';

import { TimeClockApiKeyGuard } from './guards/time-clock-api-key.guard';

@Module({
  imports: [PrismaModule, LicenseModule],

  controllers: [
    TimeEntryController,
    AbsenceRecordController,
    TimeClockPunchController,
    TimeClockApiKeyController,
  ],

  providers: [
    TimeEntryRepository,
    TimeSheetApprovalRepository,
    TimeEntryAdjustmentRepository,
    AbsenceRecordRepository,
    TimeTrackingService,
    AbsenceService,
    TimeClockApiKeyService,
    TimeClockApiKeyGuard,
  ],

  exports: [TimeTrackingService, AbsenceService],
})
export class TimeTrackingModule {}
