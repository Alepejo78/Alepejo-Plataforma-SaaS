import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { ChartOfAccountClassificationsModule } from '../chart-of-account-classifications/chart-of-account-classifications.module';

import { ChartOfAccountsController } from './controllers/chart-of-accounts.controller';
import { ChartOfAccountsService } from './services/chart-of-accounts.service';
import { ChartOfAccountsRepository } from './repositories/chart-of-accounts.repository';

@Module({
  imports: [PrismaModule, ChartOfAccountClassificationsModule],
  controllers: [ChartOfAccountsController],
  providers: [ChartOfAccountsService, ChartOfAccountsRepository],
  exports: [ChartOfAccountsService, ChartOfAccountsRepository],
})
export class ChartOfAccountsModule {}
