import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { SectorsController } from './controllers/sectors.controller';
import { SectorsService } from './services/sectors.service';
import { SectorsRepository } from './repositories/sectors.repository';

@Module({
  imports: [PrismaModule],
  controllers: [SectorsController],
  providers: [SectorsService, SectorsRepository],
  exports: [SectorsService, SectorsRepository],
})
export class SectorsModule {}
