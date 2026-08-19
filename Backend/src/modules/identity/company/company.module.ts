import { Module } from '@nestjs/common';

import { CompanyController } from './controllers/company.controller';
import { CompanyService } from './services/company.service';
import { CompanyOnboardingService } from './services/company-onboarding.service';
import { CompanyRepository } from './repositories/company.repository';

import { PrismaModule } from '../../../core/prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { LicenseModule } from '../license/license.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, UsersModule, LicenseModule, AuthModule],
  controllers: [CompanyController],
  providers: [
    CompanyService,
    CompanyOnboardingService,
    CompanyRepository,
  ],
  exports: [CompanyService],
})
export class CompanyModule {}