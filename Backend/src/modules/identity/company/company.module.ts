import { Module } from '@nestjs/common';

import { CompanyController } from './controllers/company.controller';
import { CompanyService } from './services/company.service';
import { CompanyOnboardingService } from './services/company-onboarding.service';
import { CompanyRepository } from './repositories/company.repository';

import { PrismaModule } from '../../../core/prisma/prisma.module';
import { DefaultAccountingModule } from '../../../core/default-accounting/default-accounting.module';
import { UsersModule } from '../users/users.module';
import { LicenseModule } from '../license/license.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../../billing/billing.module';

import { CompanyDeletionService } from './services/company-deletion.service';

@Module({
  imports: [
    PrismaModule,
    DefaultAccountingModule,
    UsersModule,
    LicenseModule,
    AuthModule,
    BillingModule,
  ],
  controllers: [CompanyController],
  providers: [
    CompanyService,
    CompanyOnboardingService,
    CompanyDeletionService,
    CompanyRepository,
  ],
  exports: [CompanyService],
})
export class CompanyModule {}