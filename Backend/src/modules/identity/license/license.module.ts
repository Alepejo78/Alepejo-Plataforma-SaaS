import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../core/prisma/prisma.module';
import { BillingModule } from '../../billing/billing.module';

import { LicenseController } from './controllers/license.controller';
import { LicenseService } from './services/license.service';
import { LicenseRepository } from './repositories/license.repository';
import { LicenseGuard } from './guards/license.guard';

@Module({
  imports: [PrismaModule, BillingModule],

  controllers: [LicenseController],

  providers: [
    LicenseRepository,
    LicenseService,
    LicenseGuard,
  ],

  exports: [
    LicenseRepository,
    LicenseService,
    LicenseGuard,
  ],
})
export class LicenseModule {}