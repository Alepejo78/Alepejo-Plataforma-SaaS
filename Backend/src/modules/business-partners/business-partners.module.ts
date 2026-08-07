import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { BusinessPartnersController } from './controllers/business-partners.controller';
import { BusinessPartnersService } from './services/business-partners.service';
import { BusinessPartnersRepository } from './repositories/business-partners.repository';

@Module({
  imports: [PrismaModule],
  controllers: [BusinessPartnersController],
  providers: [
    BusinessPartnersRepository,
    BusinessPartnersService,
  ],
  exports: [
    BusinessPartnersRepository,
    BusinessPartnersService,
  ],
})
export class BusinessPartnersModule {}
