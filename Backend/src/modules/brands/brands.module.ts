import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { BrandsController } from './controllers/brands.controller';
import { BrandsService } from './services/brands.service';
import { BrandsRepository } from './repositories/brands.repository';

@Module({
  imports: [PrismaModule],
  controllers: [BrandsController],
  providers: [
    BrandsService,
    BrandsRepository,
  ],
  exports: [
    BrandsService,
    BrandsRepository,
  ],
})
export class BrandsModule {}