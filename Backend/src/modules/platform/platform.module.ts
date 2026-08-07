import { Module } from '@nestjs/common';

import { BusinessPartnersModule } from '../business-partners/business-partners.module';

@Module({
  imports: [
    BusinessPartnersModule,
  ],
  exports: [
    BusinessPartnersModule,
  ],
})
export class PlatformModule {}
