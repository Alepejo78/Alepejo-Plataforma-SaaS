import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';
import { LicenseModule } from '../identity/license/license.module';

import { SalesSettingsController } from './controllers/sales-settings.controller';
import { SalesSettingsRepository } from './repositories/sales-settings.repository';
import { SalesSettingsService } from './services/sales-settings.service';

@Module({
  imports: [PrismaModule, LicenseModule],

  controllers: [SalesSettingsController],

  providers: [SalesSettingsRepository, SalesSettingsService],

  exports: [SalesSettingsService],
})
export class SalesSettingsModule {}
