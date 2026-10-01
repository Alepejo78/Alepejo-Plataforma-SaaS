import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../core/prisma/prisma.module';
import { DefaultAccountingModule } from '../../../core/default-accounting/default-accounting.module';
import { BillingModule } from '../../billing/billing.module';

import { LicenseController } from './controllers/license.controller';
import { LicenseService } from './services/license.service';
import { LicenseRepository } from './repositories/license.repository';
import { LicenseGuard } from './guards/license.guard';
import { SiteWebIntegrationClientService } from './services/site-web-integration-client.service';
import { WebsiteFinancialEntryService } from './services/website-financial-entry.service';

@Module({
  imports: [PrismaModule, BillingModule, DefaultAccountingModule],

  controllers: [LicenseController],

  providers: [
    LicenseRepository,
    LicenseService,
    LicenseGuard,
    SiteWebIntegrationClientService,
    WebsiteFinancialEntryService,
  ],

  exports: [
    LicenseRepository,
    LicenseService,
    LicenseGuard,
  ],
})
export class LicenseModule {}