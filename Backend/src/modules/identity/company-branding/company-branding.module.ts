import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../core/prisma/prisma.module';

import { CompanyBrandingController } from './controllers/company-branding.controller';
import { CompanyBrandingService } from './services/company-branding.service';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyBrandingController],
  providers: [CompanyBrandingService],
})
export class CompanyBrandingModule {}
