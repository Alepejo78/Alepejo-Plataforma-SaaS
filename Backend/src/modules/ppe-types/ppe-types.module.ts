import { Module } from '@nestjs/common';

import { PrismaModule } from '../../core/prisma/prisma.module';

import { PpeTypesController } from './controllers/ppe-types.controller';
import { PpeTypesService } from './services/ppe-types.service';
import { PpeTypesRepository } from './repositories/ppe-types.repository';

@Module({
  imports: [PrismaModule],
  controllers: [PpeTypesController],
  providers: [PpeTypesService, PpeTypesRepository],
  exports: [PpeTypesService, PpeTypesRepository],
})
export class PpeTypesModule {}
