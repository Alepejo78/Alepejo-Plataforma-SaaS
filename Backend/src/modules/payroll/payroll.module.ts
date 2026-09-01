import { forwardRef, Module as NestModule } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { LicenseModule } from '../identity/license/license.module';
import { TimeTrackingModule } from '../time-tracking/time-tracking.module';
import { FinancialEntriesModule } from '../financial-entries/financial-entries.module';
import { DocumentSequenceModule } from '../../core/document-sequence/document-sequence.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { PayrollTaxTableController } from './controllers/payroll-tax-table.controller';
import { PayrollSettingsController } from './controllers/payroll-settings.controller';
import { PayrollController } from './controllers/payroll.controller';
import { ThirteenthSalaryController } from './controllers/thirteenth-salary.controller';
import { VacationController } from './controllers/vacation.controller';
import { PayrollTaxTableRepository } from './repositories/payroll-tax-table.repository';
import { PayrollSettingsRepository } from './repositories/payroll-settings.repository';
import { PayrollRepository } from './repositories/payroll.repository';
import { ThirteenthSalaryRepository } from './repositories/thirteenth-salary.repository';
import { VacationPeriodRepository } from './repositories/vacation-period.repository';
import { VacationGrantRepository } from './repositories/vacation-grant.repository';
import { PayrollTaxTableService } from './services/payroll-tax-table.service';
import { PayrollSettingsService } from './services/payroll-settings.service';
import { PayrollCalculationService } from './services/payroll-calculation.service';
import { PayrollMonthSummaryService } from './services/payroll-month-summary.service';
import { PayrollItemBuilderService } from './services/payroll-item-builder.service';
import { PayrollService } from './services/payroll.service';
import { PayrollConfirmationService } from './services/payroll-confirmation.service';
import { PayslipPdfService } from './services/payslip-pdf.service';
import { PayrollReportService } from './services/payroll-report.service';
import { ThirteenthSalaryItemBuilderService } from './services/thirteenth-salary-item-builder.service';
import { ThirteenthSalaryService } from './services/thirteenth-salary.service';
import { ThirteenthConfirmationService } from './services/thirteenth-confirmation.service';
import { VacationPeriodService } from './services/vacation-period.service';
import { VacationGrantBuilderService } from './services/vacation-grant-builder.service';
import { VacationGrantService } from './services/vacation-grant.service';
import { VacationConfirmationService } from './services/vacation-confirmation.service';
import { SalaryAdvanceController } from './controllers/salary-advance.controller';
import { SalaryAdvanceRepository } from './repositories/salary-advance.repository';
import { SalaryAdvanceService } from './services/salary-advance.service';
import { SalaryAdvanceConfirmationService } from './services/salary-advance-confirmation.service';

@NestModule({
  imports: [
    PrismaModule,
    LicenseModule,
    TimeTrackingModule,
    forwardRef(() => FinancialEntriesModule),
    DocumentSequenceModule,
    NotificationsModule,
  ],

  controllers: [
    PayrollTaxTableController,
    PayrollSettingsController,
    PayrollController,
    ThirteenthSalaryController,
    VacationController,
    SalaryAdvanceController,
  ],

  providers: [
    PayrollTaxTableRepository,
    PayrollSettingsRepository,
    PayrollRepository,
    ThirteenthSalaryRepository,
    VacationPeriodRepository,
    VacationGrantRepository,
    SalaryAdvanceRepository,
    PayrollTaxTableService,
    PayrollSettingsService,
    PayrollCalculationService,
    PayrollMonthSummaryService,
    PayrollItemBuilderService,
    PayrollService,
    PayrollConfirmationService,
    PayslipPdfService,
    PayrollReportService,
    ThirteenthSalaryItemBuilderService,
    ThirteenthSalaryService,
    ThirteenthConfirmationService,
    VacationPeriodService,
    VacationGrantBuilderService,
    VacationGrantService,
    VacationConfirmationService,
    SalaryAdvanceService,
    SalaryAdvanceConfirmationService,
  ],

  exports: [
    PayrollTaxTableService,
    PayrollSettingsService,
    PayrollCalculationService,
    PayrollMonthSummaryService,
    PayrollConfirmationService,
    VacationConfirmationService,
    ThirteenthConfirmationService,
    SalaryAdvanceConfirmationService,
  ],
})
export class PayrollModule {}
