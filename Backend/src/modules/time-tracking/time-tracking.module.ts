import { forwardRef, Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { LicenseModule } from '../identity/license/license.module';
import { EmployeesModule } from '../employees/employees.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PayrollModule } from '../payroll/payroll.module';

import { TimeEntryController } from './controllers/time-entry.controller';
import { AbsenceRecordController } from './controllers/absence-record.controller';
import { TimeClockPunchController } from './controllers/time-clock-punch.controller';
import { TimeClockApiKeyController } from './controllers/time-clock-api-key.controller';

import { TimeEntryRepository } from './repositories/time-entry.repository';
import { TimeSheetApprovalRepository } from './repositories/time-sheet-approval.repository';
import { TimeEntryAdjustmentRepository } from './repositories/time-entry-adjustment.repository';
import { AbsenceRecordRepository } from './repositories/absence-record.repository';

import { TimeTrackingService } from './services/time-tracking.service';
import { TimeEntryConfirmationService } from './services/time-entry-confirmation.service';
import { AbsenceService } from './services/absence.service';
import { TimeClockApiKeyService } from './services/time-clock-api-key.service';

import { TimeClockApiKeyGuard } from './guards/time-clock-api-key.guard';

@Module({
  imports: [
    PrismaModule,
    LicenseModule,
    EmployeesModule,
    NotificationsModule,
    forwardRef(() => PayrollModule),
  ],

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
    TimeEntryConfirmationService,
    AbsenceService,
    TimeClockApiKeyService,
    TimeClockApiKeyGuard,
  ],

  exports: [TimeTrackingService, AbsenceService, TimeEntryConfirmationService],
})
export class TimeTrackingModule {}
