import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { SiteVisitsController } from './controllers/site-visits.controller';
import { SiteVisitsService } from './services/site-visits.service';

@Module({
  imports: [PrismaModule],
  controllers: [SiteVisitsController],
  providers: [SiteVisitsService],
})
export class SiteVisitsModule {}
