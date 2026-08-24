import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { CompanyModule } from '../identity/company/company.module';
import { FinancialEntriesModule } from '../financial-entries/financial-entries.module';
import { EmployeesModule } from '../employees/employees.module';

import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';

@Module({
  imports: [
    PrismaModule,
    CompanyModule,
    FinancialEntriesModule,
    EmployeesModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
