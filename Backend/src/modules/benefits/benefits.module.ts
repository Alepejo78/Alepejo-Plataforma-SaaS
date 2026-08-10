import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { BenefitsController } from './controllers/benefits.controller';
import { BenefitsService } from './services/benefits.service';
import { BenefitsRepository } from './repositories/benefits.repository';

@Module({
  imports: [PrismaModule],
  controllers: [BenefitsController],
  providers: [BenefitsService, BenefitsRepository],
  exports: [BenefitsService, BenefitsRepository],
})
export class BenefitsModule {}
