import { Module } from '@nestjs/common';

import { LicenseModule } from '../identity/license/license.module';
import { EmployeesModule } from '../employees/employees.module';
import { JobFunctionsModule } from '../job-functions/job-functions.module';
import { SectorsModule } from '../sectors/sectors.module';
import { WorkSchedulesModule } from '../work-schedules/work-schedules.module';

import { EmployeeImportController } from './controllers/employee-import.controller';
import { EmployeeImportService } from './services/employee-import.service';

@Module({
  imports: [
    LicenseModule,
    EmployeesModule,
    JobFunctionsModule,
    SectorsModule,
    WorkSchedulesModule,
  ],
  controllers: [EmployeeImportController],
  providers: [EmployeeImportService],
})
export class EmployeeImportModule {}
