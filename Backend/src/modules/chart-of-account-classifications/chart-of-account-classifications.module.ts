import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { ChartOfAccountClassificationsController } from './controllers/chart-of-account-classifications.controller';
import { ChartOfAccountClassificationsService } from './services/chart-of-account-classifications.service';
import { ChartOfAccountClassificationsRepository } from './repositories/chart-of-account-classifications.repository';

@Module({
  imports: [PrismaModule],
  controllers: [ChartOfAccountClassificationsController],
  providers: [
    ChartOfAccountClassificationsService,
    ChartOfAccountClassificationsRepository,
  ],
  exports: [
    ChartOfAccountClassificationsService,
    ChartOfAccountClassificationsRepository,
  ],
})
export class ChartOfAccountClassificationsModule {}
