import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { FinancialEntriesModule } from '../financial-entries/financial-entries.module';

import { BudgetsController } from './controllers/budgets.controller';
import { BudgetsService } from './services/budgets.service';
import { BudgetsRepository } from './repositories/budgets.repository';

@Module({
  imports: [PrismaModule, FinancialEntriesModule],
  controllers: [BudgetsController],
  providers: [BudgetsService, BudgetsRepository],
  exports: [BudgetsService, BudgetsRepository],
})
export class BudgetsModule {}
