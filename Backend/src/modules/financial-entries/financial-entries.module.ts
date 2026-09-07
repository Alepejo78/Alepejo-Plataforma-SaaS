import { forwardRef, Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { BusinessPartnersModule } from '../business-partners/business-partners.module';
import { PayrollModule } from '../payroll/payroll.module';
import { EntryChargesModule } from '../entry-charges/entry-charges.module';

import { FinancialEntriesController } from './controllers/financial-entries.controller';
import { FinancialEntriesService } from './services/financial-entries.service';
import { FinancialEntriesRepository } from './repositories/financial-entries.repository';

@Module({
  imports: [
    PrismaModule,
    BusinessPartnersModule,
    forwardRef(() => PayrollModule),
    forwardRef(() => EntryChargesModule),
  ],
  controllers: [FinancialEntriesController],
  providers: [
    FinancialEntriesService,
    FinancialEntriesRepository,
  ],
  exports: [FinancialEntriesService, FinancialEntriesRepository],
})
export class FinancialEntriesModule {}
