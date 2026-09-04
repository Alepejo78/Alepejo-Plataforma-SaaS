import { Module } from '@nestjs/common';

import { LicenseModule } from '../identity/license/license.module';
import { BusinessPartnersModule } from '../business-partners/business-partners.module';

import { PartnerImportController } from './controllers/partner-import.controller';
import { PartnerImportService } from './services/partner-import.service';

@Module({
  imports: [LicenseModule, BusinessPartnersModule],
  controllers: [PartnerImportController],
  providers: [PartnerImportService],
})
export class PartnerImportModule {}
